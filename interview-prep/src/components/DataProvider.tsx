"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Category, Question } from "@/lib/types";
import {
  fetchCategories,
  fetchQuestions,
  fetchQuestion,
  type QuestionInput,
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  deleteQuestion as dbDelete,
  setStatus as dbSetStatus,
  setPointCompleted as dbSetPoint,
  markReviewed as dbMarkReviewed,
  saveAnswer as dbSaveAnswer,
  setAnswerLocked as dbSetAnswerLocked,
  setPinned as dbSetPinned,
} from "@/lib/db";

interface DataContextValue {
  session: Session | null;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  categories: Category[];
  questions: Question[];
  reload: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createQuestion: (input: QuestionInput) => Promise<string>;
  updateQuestion: (id: string, input: QuestionInput) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  setStatus: (id: string, status: Question["status"]) => Promise<void>;
  setPointCompleted: (pointId: string, completed: boolean) => Promise<void>;
  markReviewed: (id: string) => Promise<void>;
  saveAnswer: (id: string, answer: string, locked?: boolean) => Promise<void>;
  setAnswerLocked: (id: string, locked: boolean) => Promise<void>;
  setPinned: (id: string, pinned: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, qs] = await Promise.all([fetchCategories(), fetchQuestions()]);
      setCategories(cats);
      setQuestions(qs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) reload();
    else {
      setCategories([]);
      setQuestions([]);
    }
  }, [session, reload]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      session,
      authReady,
      loading,
      error,
      categories,
      questions,
      reload,
      signIn,
      signOut,
      createQuestion: async (input) => {
        const id = await dbCreate(input);
        const q = await fetchQuestion(id); // fetch just the new row, not everything
        if (q) setQuestions((prev) => [q, ...prev]);
        return id;
      },
      updateQuestion: async (id, input) => {
        await dbUpdate(id, input);
        const q = await fetchQuestion(id);
        if (q) setQuestions((prev) => prev.map((x) => (x.id === id ? q : x)));
      },
      deleteQuestion: async (id) => {
        setQuestions((prev) => prev.filter((x) => x.id !== id)); // optimistic
        await dbDelete(id);
      },
      setStatus: async (id, status) => {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === id
              ? { ...q, status, lastReviewedAt: new Date().toISOString() }
              : q
          )
        ); // optimistic
        await dbSetStatus(id, status);
      },
      setPointCompleted: async (pointId, completed) => {
        await dbSetPoint(pointId, completed);
        // optimistic: update local state without full reload
        setQuestions((prev) =>
          prev.map((q) => ({
            ...q,
            keyPoints: q.keyPoints.map((p) =>
              p.id === pointId ? { ...p, completed } : p
            ),
          }))
        );
      },
      markReviewed: async (id) => {
        const iso = new Date().toISOString();
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, lastReviewedAt: iso } : q))
        ); // optimistic
        await dbMarkReviewed(id);
      },
      saveAnswer: async (id, answer, locked) => {
        // optimistic: reflect immediately, persist in one round-trip
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === id
              ? { ...q, answer: answer || undefined, ...(locked !== undefined ? { answerLocked: locked } : {}) }
              : q
          )
        );
        await dbSaveAnswer(id, answer, locked);
      },
      setAnswerLocked: async (id, locked) => {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, answerLocked: locked } : q))
        ); // optimistic
        await dbSetAnswerLocked(id, locked);
      },
      setPinned: async (id, pinned) => {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, pinned } : q))
        ); // optimistic
        await dbSetPinned(id, pinned);
      },
    }),
    [session, authReady, loading, error, categories, questions, reload, signIn, signOut]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
