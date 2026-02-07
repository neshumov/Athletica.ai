import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { EQUIPMENT, EXERCISE_TYPES, MUSCLE_GROUPS } from "./constants";

const API_BASE = "/api";
const GOAL_TYPES = ["bulk", "cut", "maintain"] as const;
const GOAL_LABELS: Record<string, string> = {
  bulk: "Bulk",
  cut: "Cut",
  maintain: "Maintain"
};

type Goal = {
  id: number;
  goal_type: string;
  start_date: string;
  end_date?: string | null;
  priority_muscle_groups?: string[] | null;
  is_active: boolean;
};

type Exercise = {
  id: number;
  name: string;
  exercise_type: string;
  muscle_group: string;
  equipment: string;
};

type WorkoutTemplate = {
  id: number;
  name: string;
};

type TemplateExercise = {
  exercise_id: number;
  name: string;
  exercise_type: string;
  muscle_group: string;
  equipment: string;
  target_sets?: number | null;
};

type CalendarExercise = {
  exercise_id: number;
  set_number: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_minutes?: number | null;
};

type CalendarItem = {
  id: number;
  date: string;
  workout_template_id: number;
  name_snapshot: string;
};

type NutritionEntry = {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};

const recoveryTrend = [
  { day: "Mon", score: 58 },
  { day: "Tue", score: 61 },
  { day: "Wed", score: 55 },
  { day: "Thu", score: 62 },
  { day: "Fri", score: 65 },
  { day: "Sat", score: 59 },
  { day: "Sun", score: 63 }
];

const sleepTrend = [
  { day: "Mon", hours: 6.8 },
  { day: "Tue", hours: 7.2 },
  { day: "Wed", hours: 6.1 },
  { day: "Thu", hours: 7.6 },
  { day: "Fri", hours: 7.0 },
  { day: "Sat", hours: 8.1 },
  { day: "Sun", hours: 7.4 }
];

const volumeTrend = [
  { week: "W1", chest: 14, back: 18 },
  { week: "W2", chest: 16, back: 20 },
  { week: "W3", chest: 15, back: 17 },
  { week: "W4", chest: 18, back: 22 }
];

const recommendations = [
  {
    title: "Reduce shoulder volume by 20%",
    reason: "HRV dropped for 3 days; shoulder volume +18%"
  },
  {
    title: "Add 2 sets of hamstrings",
    reason: "Goal: hypertrophy; current volume below target"
  }
];

function useApi<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}${url}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, setData } as const;
}

export default function App() {
  const [tab, setTab] = useState<
    "dashboard" | "goals" | "exercises" | "workouts" | "calendar" | "nutrition"
  >("dashboard");
  const { data: goals, setData: setGoals } = useApi<Goal[]>("/goals", [tab]);
  const { data: exercises, setData: setExercises } = useApi<Exercise[]>(
    "/exercises",
    [tab]
  );
  const { data: templates, setData: setTemplates } = useApi<WorkoutTemplate[]>(
    "/workouts/templates",
    [tab]
  );
  const { data: calendarItems, setData: setCalendarItems } = useApi<CalendarItem[]>(
    "/calendar",
    [tab]
  );
  const { data: nutrition, setData: setNutrition } = useApi<NutritionEntry[]>(
    "/nutrition",
    [tab]
  );

  const [goalForm, setGoalForm] = useState({
    goal_type: "bulk",
    start_date: "",
    end_date: "",
    priority_muscle_groups: [] as string[]
  });
  const [goalErrors, setGoalErrors] = useState<string[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

  const [exerciseForm, setExerciseForm] = useState<{
    name: string;
    exercise_type: string;
    muscle_group: string;
    equipment: string;
  }>({
    name: "",
    exercise_type: "strength",
    muscle_group: MUSCLE_GROUPS[0],
    equipment: EQUIPMENT[0]
  });
  const [exerciseErrors, setExerciseErrors] = useState<string[]>([]);

  const [templateName, setTemplateName] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateExerciseId, setTemplateExerciseId] = useState<string>("");
  const [templateTargetSets, setTemplateTargetSets] = useState<number>(3);
  const [templateErrors, setTemplateErrors] = useState<string[]>([]);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());

  const [calendarForm, setCalendarForm] = useState({
    date: "",
    workout_template_id: ""
  });
  const [calendarExercises, setCalendarExercises] = useState<CalendarExercise[]>([]);
  const [calendarErrors, setCalendarErrors] = useState<string[]>([]);
  const [calendarEditId, setCalendarEditId] = useState<number | null>(null);

  const [nutritionForm, setNutritionForm] = useState({
    date: "",
    calories: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0
  });
  const [nutritionErrors, setNutritionErrors] = useState<string[]>([]);

  const activeGoal = useMemo(() => goals?.find((g) => g.is_active), [goals]);
  const exerciseMap = useMemo(() => {
    return new Map((exercises || []).map((ex) => [ex.id, ex]));
  }, [exercises]);
  const nutritionTrend = useMemo(() => {
    const entries = (nutrition || [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    return entries.slice(-7).map((n) => ({
      day: n.date.slice(5),
      calories: n.calories,
      protein: n.protein_g,
      fat: n.fat_g,
      carbs: n.carbs_g
    }));
  }, [nutrition]);

  const togglePriority = (muscle: string) => {
    setGoalForm((s) => {
      const exists = s.priority_muscle_groups.includes(muscle);
      return {
        ...s,
        priority_muscle_groups: exists
          ? s.priority_muscle_groups.filter((m) => m !== muscle)
          : s.priority_muscle_groups.concat(muscle)
      };
    });
  };

  const submitGoal = async () => {
    const errors: string[] = [];
    if (!goalForm.goal_type.trim()) errors.push("Goal type is required.");
    if (!goalForm.start_date) errors.push("Start date is required.");
    if (goalForm.end_date && goalForm.end_date < goalForm.start_date) {
      errors.push("End date must be after start date.");
    }
    setGoalErrors(errors);
    if (errors.length > 0) return;

    const payload = {
      goal_type: goalForm.goal_type,
      start_date: goalForm.start_date,
      end_date: goalForm.end_date || null,
      priority_muscle_groups: goalForm.priority_muscle_groups.length
        ? goalForm.priority_muscle_groups
        : null
    };
    const url = editingGoalId ? `${API_BASE}/goals/${editingGoalId}` : `${API_BASE}/goals`;
    const res = await fetch(url, {
      method: editingGoalId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (editingGoalId) {
      setGoals((goals || []).map((g) => (g.id === data.id ? data : g)));
    } else {
      setGoals((goals || []).map((g) => ({ ...g, is_active: false })).concat(data));
    }
    setEditingGoalId(null);
    setGoalForm({ goal_type: "bulk", start_date: "", end_date: "", priority_muscle_groups: [] });
  };

  const editGoal = (g: Goal) => {
    setEditingGoalId(g.id);
    setGoalForm({
      goal_type: g.goal_type,
      start_date: g.start_date,
      end_date: g.end_date || "",
      priority_muscle_groups: g.priority_muscle_groups || []
    });
  };

  const deleteGoal = async (id: number) => {
    await fetch(`${API_BASE}/goals/${id}`, { method: "DELETE" });
    setGoals((goals || []).filter((g) => g.id !== id));
  };

  const submitExercise = async () => {
    const errors: string[] = [];
    if (!exerciseForm.name.trim()) errors.push("Exercise name is required.");
    setExerciseErrors(errors);
    if (errors.length > 0) return;

    const res = await fetch(`${API_BASE}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exerciseForm)
    });
    const data = (await res.json()) as Exercise;
    setExercises((exercises || []).concat(data));
  };

  const submitTemplate = async () => {
    const errors: string[] = [];
    if (!templateName.trim()) errors.push("Template name is required.");
    setTemplateErrors(errors);
    if (errors.length > 0) return;

    const res = await fetch(`${API_BASE}/workouts/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName })
    });
    const data = (await res.json()) as WorkoutTemplate;
    setTemplates((templates || []).concat(data));
    setTemplateId(data.id);
  };

  const addTemplateExercise = async () => {
    const errors: string[] = [];
    if (!templateId) errors.push("Select a template first.");
    if (!templateExerciseId) errors.push("Select an exercise.");
    setTemplateErrors(errors);
    if (errors.length > 0 || !templateId) return;

    await fetch(`${API_BASE}/workouts/templates/${templateId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: Number(templateExerciseId),
        order_index: 0,
        target_sets: templateTargetSets || null
      })
    });
    await loadTemplateExercises(templateId);
  };

  const updateTemplateExerciseSets = (exerciseId: number, sets: number) => {
    setTemplateExercises((prev) =>
      prev.map((ex) =>
        ex.exercise_id === exerciseId ? { ...ex, target_sets: sets } : ex
      )
    );
  };

  const saveTemplateExercises = async () => {
    if (!templateId) return;
    const payload = {
      exercises: templateExercises.map((ex, index) => ({
        exercise_id: ex.exercise_id,
        order_index: index,
        target_sets: ex.target_sets ?? null
      }))
    };
    await fetch(`${API_BASE}/workouts/templates/${templateId}/exercises`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await loadTemplateExercises(templateId);
  };

  const loadTemplateExercises = async (id: number) => {
    const res = await fetch(`${API_BASE}/workouts/templates/${id}/exercises`);
    const data = (await res.json()) as TemplateExercise[];
    setTemplateExercises(data);
    const rows: CalendarExercise[] = [];
    data.forEach((ex) => {
      const sets = ex.target_sets || 1;
      for (let i = 1; i <= sets; i += 1) {
        rows.push({
          exercise_id: ex.exercise_id,
          set_number: i,
          reps: ex.exercise_type === "cardio" ? 0 : 10,
          weight_kg: 0,
          duration_minutes: ex.exercise_type === "cardio" ? 20 : 0
        });
      }
    });
    setCalendarExercises(rows);
  };

  const removeTemplateExercise = async (exerciseId: number) => {
    if (!templateId) return;
    await fetch(
      `${API_BASE}/workouts/templates/${templateId}/exercises/${exerciseId}`,
      { method: "DELETE" }
    );
    setTemplateExercises((prev) => prev.filter((ex) => ex.exercise_id !== exerciseId));
  };

  const addCalendarExerciseRow = () => {
    if (!templateExerciseId) return;
    const nextSet =
      Math.max(
        0,
        ...calendarExercises
          .filter((ex) => ex.exercise_id === Number(templateExerciseId))
          .map((ex) => ex.set_number)
      ) + 1;
    setCalendarExercises((prev) =>
      prev.concat({
        exercise_id: Number(templateExerciseId),
        set_number: nextSet,
        reps: 10,
        weight_kg: 0,
        duration_minutes: 0
      })
    );
  };

  const removeCalendarExerciseRow = (index: number) => {
    setCalendarExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitCalendar = async () => {
    const errors: string[] = [];
    if (!calendarForm.date) errors.push("Date is required.");
    if (!calendarForm.workout_template_id) errors.push("Select a workout template.");
    if (calendarExercises.length === 0) errors.push("Add at least one exercise row.");
    setCalendarErrors(errors);
    if (errors.length > 0) return;

    const payload = {
      date: calendarForm.date,
      workout_template_id: Number(calendarForm.workout_template_id),
      exercises: calendarExercises
    };
    if (calendarEditId) {
      await fetch(`${API_BASE}/calendar/${calendarEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${API_BASE}/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    setCalendarEditId(null);
    setCalendarForm({ date: "", workout_template_id: "" });
    setCalendarExercises([]);
    const refreshed = await fetch(`${API_BASE}/calendar`);
    const items = await refreshed.json();
    setCalendarItems(items);
  };

  const startEditCalendar = async (id: number) => {
    const res = await fetch(`${API_BASE}/calendar/${id}`);
    const data = await res.json();
    setCalendarEditId(id);
    setCalendarForm({
      date: data.date,
      workout_template_id: String(data.workout_template_id)
    });
    setCalendarExercises(data.exercises || []);
  };

  const deleteCalendar = async (id: number) => {
    await fetch(`${API_BASE}/calendar/${id}`, { method: "DELETE" });
    setCalendarItems((calendarItems || []).filter((c) => c.id !== id));
  };

  const submitNutrition = async () => {
    const errors: string[] = [];
    if (!nutritionForm.date) errors.push("Date is required.");
    if (nutritionForm.calories < 0) errors.push("Calories must be >= 0.");
    if (nutritionForm.protein_g < 0) errors.push("Protein must be >= 0.");
    if (nutritionForm.fat_g < 0) errors.push("Fat must be >= 0.");
    if (nutritionForm.carbs_g < 0) errors.push("Carbs must be >= 0.");
    setNutritionErrors(errors);
    if (errors.length > 0) return;

    const res = await fetch(`${API_BASE}/nutrition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutritionForm)
    });
    const data = (await res.json()) as NutritionEntry;
    setNutrition((nutrition || []).filter((n) => n.date !== data.date).concat(data));
  };

  return (
    <div className="min-h-screen bg-ink text-mist">
      <header className="border-b border-slate/60 px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-mist/60">
              Athletica
            </p>
            <h1 className="mt-2 font-display text-3xl text-white">
              Training Control Center
            </h1>
          </div>
          {activeGoal && (
            <div className="rounded-2xl border border-slate/60 bg-coal/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-mist/60">
                Active Goal
              </p>
              <p className="text-lg text-white">
                {GOAL_LABELS[activeGoal.goal_type] || activeGoal.goal_type}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-4">
          {[
            "dashboard",
            "goals",
            "exercises",
            "workouts",
            "calendar",
            "nutrition"
          ].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item as typeof tab)}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === item ? "bg-ember/20 text-ember" : "bg-slate/40 text-mist"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                    Recovery Trend
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-white">
                    Weekly Readiness
                  </h2>
                </div>
                <span className="rounded-full bg-ember/15 px-3 py-1 text-xs text-ember">
                  Light strain week
                </span>
              </div>
              <div className="mt-6 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recoveryTrend}>
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis domain={[40, 80]} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        background: "#101418",
                        border: "1px solid #252c35",
                        color: "#c7d2e3"
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#4ad0ff"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "#4ad0ff" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                Today
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">
                Daily Insight
              </h2>
              <div className="mt-6 space-y-4">
                {recommendations.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate/60 bg-slate/40 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm text-mist/70">{item.reason}</p>
                    <div className="mt-4 flex gap-3">
                      <button className="rounded-full bg-lime/20 px-4 py-1 text-xs text-lime">
                        Accept
                      </button>
                      <button className="rounded-full bg-ember/20 px-4 py-1 text-xs text-ember">
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                    Volume Balance
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">
                    Weekly Muscle Load
                  </h3>
                </div>
                <span className="rounded-full bg-ocean/15 px-3 py-1 text-xs text-ocean">
                  Target range
                </span>
              </div>
              <div className="mt-6 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend}>
                    <XAxis dataKey="week" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        background: "#101418",
                        border: "1px solid #252c35",
                        color: "#c7d2e3"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="chest"
                      stroke="#ff5c35"
                      fill="#ff5c35"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="back"
                      stroke="#c2f970"
                      fill="#c2f970"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6 md:col-span-2">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                    Sleep Trend
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">
                    Sleep Duration
                  </h3>
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sleepTrend}>
                        <XAxis dataKey="day" stroke="#6b7280" />
                        <YAxis domain={[4, 9]} stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            background: "#101418",
                            border: "1px solid #252c35",
                            color: "#c7d2e3"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="#c2f970"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: "#c2f970" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                    Recovery Trend
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">
                    Recovery Score
                  </h3>
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={recoveryTrend}>
                        <XAxis dataKey="day" stroke="#6b7280" />
                        <YAxis domain={[40, 80]} stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            background: "#101418",
                            border: "1px solid #252c35",
                            color: "#c7d2e3"
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#4ad0ff"
                          fill="#4ad0ff"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-mist/50">
                    Nutrition Trend
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">
                    Calories & Macros
                  </h3>
                </div>
                <span className="rounded-full bg-lime/15 px-3 py-1 text-xs text-lime">
                  Last 7 days
                </span>
              </div>
              <div className="mt-6 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nutritionTrend}>
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        background: "#101418",
                        border: "1px solid #252c35",
                        color: "#c7d2e3"
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#ff5c35"
                      strokeWidth={3}
                      dot={{ r: 3, stroke: "#ff5c35" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="protein"
                      stroke="#c2f970"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="carbs"
                      stroke="#4ad0ff"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fat"
                      stroke="#f7b267"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {tab === "goals" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Set Goal</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Goal Type</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={goalForm.goal_type}
                    onChange={(e) =>
                      setGoalForm((s) => ({ ...s, goal_type: e.target.value }))
                    }
                  >
                    {GOAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {GOAL_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Start Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={goalForm.start_date}
                    onChange={(e) =>
                      setGoalForm((s) => ({ ...s, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={goalForm.end_date}
                    onChange={(e) =>
                      setGoalForm((s) => ({ ...s, end_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Priority Muscles</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {MUSCLE_GROUPS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => togglePriority(m)}
                        className={`rounded-lg px-3 py-2 text-left ${
                          goalForm.priority_muscle_groups.includes(m)
                            ? "bg-ember/20 text-ember"
                            : "bg-slate/40 text-mist"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {goalErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {goalErrors.join(" ")}
                  </div>
                )}
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitGoal}
                >
                  {editingGoalId ? "Update Goal" : "Save Goal"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Goal History</h2>
              <div className="mt-4 space-y-3 text-sm">
                {(goals || []).map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-slate/60 bg-slate/40 px-4 py-3"
                  >
                    <p className="text-white">{GOAL_LABELS[g.goal_type] || g.goal_type}</p>
                    <p className="text-mist/70">
                      {g.start_date} → {g.end_date || "open"}
                    </p>
                    <p className="text-mist/70">
                      {g.priority_muscle_groups?.join(", ") || "no priorities"}
                    </p>
                    <p className="text-xs text-ember">
                      {g.is_active ? "active" : "inactive"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-lg bg-slate/50 px-3 py-1 text-xs"
                        onClick={() => editGoal(g)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg bg-ember/20 px-3 py-1 text-xs text-ember"
                        onClick={() => deleteGoal(g.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "exercises" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Exercise Library</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Name</label>
                  <input
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Exercise name"
                    value={exerciseForm.name}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Type</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={exerciseForm.exercise_type}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, exercise_type: e.target.value }))
                    }
                  >
                    {EXERCISE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === "strength" ? "Strength" : "Cardio"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Muscle Group</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={exerciseForm.muscle_group}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, muscle_group: e.target.value }))
                    }
                  >
                    {MUSCLE_GROUPS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Equipment</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={exerciseForm.equipment}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, equipment: e.target.value }))
                    }
                  >
                    {EQUIPMENT.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>
                {exerciseErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {exerciseErrors.join(" ")}
                  </div>
                )}
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitExercise}
                >
                  Add Exercise
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">All Exercises</h2>
              <div className="mt-4 space-y-3 text-sm">
                {(exercises || []).map((ex) => (
                  <div
                    key={ex.id}
                    className="rounded-2xl border border-slate/60 bg-slate/40 px-4 py-3"
                  >
                    <p className="text-white">{ex.name}</p>
                    <p className="text-mist/70">
                      {ex.exercise_type === "strength" ? "Strength" : "Cardio"} ·{" "}
                      {ex.muscle_group} · {ex.equipment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "workouts" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Workout Templates</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Template Name</label>
                  <input
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Workout template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitTemplate}
                >
                  Create Template
                </button>
                {templateErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {templateErrors.join(" ")}
                  </div>
                )}
                <div className="text-sm text-mist/70">Templates:</div>
                {(templates || []).map((t) => (
                  <button
                    key={t.id}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      templateId === t.id ? "bg-ember/20" : "bg-slate/40"
                    }`}
                    onClick={() => {
                      setTemplateId(t.id);
                      loadTemplateExercises(t.id);
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Template Exercises</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Exercise</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={templateExerciseId}
                    onChange={(e) => setTemplateExerciseId(e.target.value)}
                  >
                    <option value="">Select exercise</option>
                    {(exercises || []).map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Target Sets</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={templateTargetSets}
                    onChange={(e) => setTemplateTargetSets(Number(e.target.value))}
                  />
                </div>
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={addTemplateExercise}
                >
                  Add To Template
                </button>
                <button
                  className="rounded-lg bg-slate/50 px-4 py-2 text-sm"
                  onClick={saveTemplateExercises}
                >
                  Save Template Exercises
                </button>
                <div className="mt-4 space-y-2 text-xs text-mist/70">
                  {templateExercises.map((ex) => (
                    <div
                      key={ex.exercise_id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate/60 bg-slate/40 px-3 py-2"
                    >
                      <span>
                        {ex.name} ·{" "}
                        {ex.exercise_type === "strength" ? "Strength" : "Cardio"}
                        {ex.target_sets ? ` · ${ex.target_sets} sets` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 rounded-lg bg-slate/40 px-2 py-1 text-xs"
                          value={ex.target_sets ?? 0}
                          onChange={(e) =>
                            updateTemplateExerciseSets(
                              ex.exercise_id,
                              Number(e.target.value)
                            )
                          }
                        />
                        <button
                          className="rounded-lg bg-ember/20 px-2 py-1 text-[11px] text-ember"
                          onClick={() => removeTemplateExercise(ex.exercise_id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "calendar" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Schedule Workout</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={calendarForm.date}
                    onChange={(e) =>
                      setCalendarForm((s) => ({ ...s, date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Workout Template</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={calendarForm.workout_template_id}
                    onChange={(e) => {
                      setCalendarForm((s) => ({
                        ...s,
                        workout_template_id: e.target.value
                      }));
                      const id = Number(e.target.value);
                      if (id) {
                        loadTemplateExercises(id);
                      }
                    }}
                  >
                    <option value="">Select template</option>
                    {(templates || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Add Exercise Row</label>
                  <select
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={templateExerciseId}
                    onChange={(e) => setTemplateExerciseId(e.target.value)}
                  >
                    <option value="">Select exercise</option>
                    {(exercises || []).map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="rounded-lg bg-slate/50 px-4 py-2 text-sm"
                  onClick={addCalendarExerciseRow}
                >
                  Add Exercise Row
                </button>

                <div className="space-y-3">
                  {calendarExercises.map((ex, idx) => {
                    const meta = exerciseMap.get(ex.exercise_id);
                    const isCardio = meta?.exercise_type === "cardio";
                    const isCollapsed = collapsedExercises.has(ex.exercise_id);
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate/60 bg-slate/40 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white">
                            {meta?.name || `Exercise #${ex.exercise_id}`} · Set{" "}
                            {ex.set_number}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-lg bg-slate/50 px-2 py-1 text-[11px] text-mist"
                              onClick={() =>
                                setCollapsedExercises((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(ex.exercise_id)) {
                                    next.delete(ex.exercise_id);
                                  } else {
                                    next.add(ex.exercise_id);
                                  }
                                  return next;
                                })
                              }
                            >
                              {isCollapsed ? "Show" : "Hide"}
                            </button>
                            <button
                              className="rounded-lg bg-ember/20 px-2 py-1 text-[11px] text-ember"
                              onClick={() => removeCalendarExerciseRow(idx)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-mist/60">Exercise</label>
                            <input
                              className="rounded-lg bg-slate/40 px-3 py-2"
                              value={meta?.name || ex.exercise_id}
                              readOnly
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-mist/60">Set Number</label>
                            <input
                              type="number"
                              className="rounded-lg bg-slate/40 px-3 py-2"
                              value={ex.set_number}
                              onChange={(e) => {
                                const next = [...calendarExercises];
                                next[idx] = {
                                  ...next[idx],
                                  set_number: Number(e.target.value)
                                };
                                setCalendarExercises(next);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-mist/60">Reps</label>
                            <input
                              type="number"
                              className="rounded-lg bg-slate/40 px-3 py-2"
                              value={ex.reps || 0}
                              onChange={(e) => {
                                const next = [...calendarExercises];
                                next[idx] = { ...next[idx], reps: Number(e.target.value) };
                                setCalendarExercises(next);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-mist/60">Weight (kg)</label>
                            <input
                              type="number"
                              className="rounded-lg bg-slate/40 px-3 py-2"
                              value={ex.weight_kg || 0}
                              onChange={(e) => {
                                const next = [...calendarExercises];
                                next[idx] = {
                                  ...next[idx],
                                  weight_kg: Number(e.target.value)
                                };
                                setCalendarExercises(next);
                              }}
                            />
                          </div>
                          {isCardio && (
                            <div className="space-y-1">
                              <label className="text-xs text-mist/60">Duration (min)</label>
                              <input
                                type="number"
                                className="rounded-lg bg-slate/40 px-3 py-2"
                                value={ex.duration_minutes || 0}
                                onChange={(e) => {
                                  const next = [...calendarExercises];
                                  next[idx] = {
                                    ...next[idx],
                                    duration_minutes: Number(e.target.value)
                                  };
                                  setCalendarExercises(next);
                                }}
                              />
                            </div>
                          )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {calendarErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {calendarErrors.join(" ")}
                  </div>
                )}
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitCalendar}
                >
                  {calendarEditId ? "Update Day" : "Save Day"}
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Scheduled</h2>
              <div className="mt-4 space-y-3 text-sm">
                {(calendarItems || []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate/60 bg-slate/40 px-4 py-3"
                  >
                    <p className="text-white">{item.date}</p>
                    <p className="text-mist/70">{item.name_snapshot}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-lg bg-slate/50 px-3 py-1 text-xs"
                        onClick={() => startEditCalendar(item.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg bg-ember/20 px-3 py-1 text-xs text-ember"
                        onClick={() => deleteCalendar(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "nutrition" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Log Nutrition</h2>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    value={nutritionForm.date}
                    onChange={(e) =>
                      setNutritionForm((s) => ({ ...s, date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Calories</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Calories"
                    value={nutritionForm.calories}
                    onChange={(e) =>
                      setNutritionForm((s) => ({ ...s, calories: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Protein (g)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Protein (g)"
                    value={nutritionForm.protein_g}
                    onChange={(e) =>
                      setNutritionForm((s) => ({ ...s, protein_g: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Fat (g)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Fat (g)"
                    value={nutritionForm.fat_g}
                    onChange={(e) =>
                      setNutritionForm((s) => ({ ...s, fat_g: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-mist/60">Carbs (g)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Carbs (g)"
                    value={nutritionForm.carbs_g}
                    onChange={(e) =>
                      setNutritionForm((s) => ({ ...s, carbs_g: Number(e.target.value) }))
                    }
                  />
                </div>
                {nutritionErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {nutritionErrors.join(" ")}
                  </div>
                )}
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitNutrition}
                >
                  Save Nutrition
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">History</h2>
              <div className="mt-4 space-y-3 text-sm">
                {(nutrition || []).map((n) => (
                  <div
                    key={n.date}
                    className="rounded-2xl border border-slate/60 bg-slate/40 px-4 py-3"
                  >
                    <p className="text-white">{n.date}</p>
                    <p className="text-mist/70">
                      {n.calories} kcal · P {n.protein_g}g · F {n.fat_g}g · C {n.carbs_g}g
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
