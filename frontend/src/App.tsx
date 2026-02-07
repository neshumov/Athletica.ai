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

const API_BASE = "";

type Goal = {
  id: number;
  goal_type: string;
  start_date: string;
  end_date?: string | null;
  priority_muscle_groups?: string[] | null;
  is_active: boolean;
};

type Program = {
  id: number;
  name: string;
  is_active: boolean;
};

type WorkoutExercise = {
  exercise_name: string;
  set_number: number;
  exercise_type: string;
  muscle_group?: string | null;
  equipment?: string | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_minutes?: number | null;
};

type LastResult = {
  workout: { id?: number; date: string; workout_quality: string } | null;
  exercises: WorkoutExercise[];
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
    "dashboard" | "goals" | "plans" | "workouts" | "nutrition"
  >("dashboard");
  const { data: goals, setData: setGoals } = useApi<Goal[]>("/goals", [tab]);
  const { data: programs, setData: setPrograms } = useApi<Program[]>(
    "/programs",
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
    priority_muscle_groups: ""
  });
  const [goalErrors, setGoalErrors] = useState<string[]>([]);

  const [programName, setProgramName] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [dayName, setDayName] = useState("");
  const [dayId, setDayId] = useState<number | null>(null);
  const [exerciseForm, setExerciseForm] = useState<{
    exercise_type: string;
    exercise_name: string;
    muscle_group: string;
    equipment: string;
    target_sets: number;
    target_reps: number;
    target_weight_kg: number;
    target_duration_minutes: number;
  }>({
    exercise_type: "strength",
    exercise_name: "",
    muscle_group: MUSCLE_GROUPS[0],
    equipment: EQUIPMENT[0],
    target_sets: 3,
    target_reps: 10,
    target_weight_kg: 0,
    target_duration_minutes: 0
  });
  const [planErrors, setPlanErrors] = useState<string[]>([]);

  const [workoutForm, setWorkoutForm] = useState({
    date: "",
    duration_minutes: 60,
    subjective_fatigue: 5,
    workout_quality: "ok",
    program_day_id: ""
  });

  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([
    {
      exercise_name: "",
      set_number: 1,
      exercise_type: "strength",
      muscle_group: MUSCLE_GROUPS[0],
      equipment: EQUIPMENT[0],
      reps: 10,
      weight_kg: 0,
      duration_minutes: 0
    }
  ]);
  const [workoutErrors, setWorkoutErrors] = useState<string[]>([]);

  const [lastQueryDayId, setLastQueryDayId] = useState("");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [sortMode, setSortMode] = useState<"name" | "type" | "muscle">("name");

  const [nutritionForm, setNutritionForm] = useState({
    date: "",
    calories: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0
  });
  const [nutritionErrors, setNutritionErrors] = useState<string[]>([]);

  const activeGoal = useMemo(() => goals?.find((g) => g.is_active), [goals]);

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
      priority_muscle_groups: goalForm.priority_muscle_groups
        ? goalForm.priority_muscle_groups.split(",").map((s) => s.trim())
        : null
    };
    const res = await fetch(`${API_BASE}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setGoals((goals || []).map((g) => ({ ...g, is_active: false })).concat(data));
  };

  const submitProgram = async () => {
    const errors: string[] = [];
    if (!programName.trim()) errors.push("Program name is required.");
    setPlanErrors(errors);
    if (errors.length > 0) return;

    const res = await fetch(`${API_BASE}/programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: programName })
    });
    const data = await res.json();
    setPrograms((programs || []).concat(data));
  };

  const submitDay = async () => {
    const errors: string[] = [];
    if (!programId) errors.push("Select a program first.");
    if (!dayName.trim()) errors.push("Day name is required.");
    setPlanErrors(errors);
    if (errors.length > 0 || !programId) return;

    await fetch(`${API_BASE}/programs/${programId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_name: dayName })
    });
  };

  const submitExercise = async () => {
    const errors: string[] = [];
    if (!dayId) errors.push("Program day id is required.");
    if (!exerciseForm.exercise_name.trim()) errors.push("Exercise name is required.");
    if (exerciseForm.exercise_type === "cardio" && exerciseForm.target_duration_minutes <= 0) {
      errors.push("Cardio requires duration minutes.");
    }
    if (exerciseForm.exercise_type === "strength" && exerciseForm.target_sets <= 0) {
      errors.push("Strength requires target sets.");
    }
    setPlanErrors(errors);
    if (errors.length > 0 || !dayId) return;

    await fetch(`${API_BASE}/program-days/${dayId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...exerciseForm,
        target_weight_kg:
          exerciseForm.exercise_type === "cardio" ? null : exerciseForm.target_weight_kg,
        target_duration_minutes:
          exerciseForm.exercise_type === "cardio"
            ? exerciseForm.target_duration_minutes
            : null
      })
    });
  };

  const submitWorkout = async () => {
    const errors: string[] = [];
    if (!workoutForm.date) errors.push("Workout date is required.");
    if (workoutForm.duration_minutes <= 0) errors.push("Duration must be positive.");
    if (workoutExercises.some((ex) => !ex.exercise_name.trim())) {
      errors.push("Every exercise row needs a name.");
    }
    if (
      workoutExercises.some(
        (ex) => ex.exercise_type === "cardio" && (!ex.duration_minutes || ex.duration_minutes <= 0)
      )
    ) {
      errors.push("Cardio rows require duration minutes.");
    }
    setWorkoutErrors(errors);
    if (errors.length > 0) return;

    const payload = {
      ...workoutForm,
      program_day_id: workoutForm.program_day_id
        ? Number(workoutForm.program_day_id)
        : null,
      exercises: workoutExercises.map((ex) => ({
        ...ex,
        reps: ex.exercise_type === "cardio" ? 0 : ex.reps,
        weight_kg: ex.exercise_type === "cardio" ? 0 : ex.weight_kg
      }))
    };
    await fetch(`${API_BASE}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  };

  const fetchLast = async () => {
    if (!lastQueryDayId) return;
    const res = await fetch(
      `${API_BASE}/workouts/last?program_day_id=${lastQueryDayId}`
    );
    const data = (await res.json()) as LastResult;
    setLastResult(data);
  };

  const deleteLastWorkout = async () => {
    if (!lastResult?.workout?.id) return;
    await fetch(`${API_BASE}/workouts/${lastResult.workout.id}`, {
      method: "DELETE"
    });
    setLastResult(null);
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

  const sortedExercises = useMemo(() => {
    if (!lastResult?.exercises) return [];
    const list = [...lastResult.exercises];
    list.sort((a, b) => {
      if (sortMode === "type") return a.exercise_type.localeCompare(b.exercise_type);
      if (sortMode === "muscle") return (a.muscle_group || "").localeCompare(b.muscle_group || "");
      return a.exercise_name.localeCompare(b.exercise_name);
    });
    return list;
  }, [lastResult, sortMode]);

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
              <p className="text-lg text-white">{activeGoal.goal_type}</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-4">
          {["dashboard", "goals", "plans", "workouts", "nutrition"].map((item) => (
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
          </section>
        )}

        {tab === "goals" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Set Goal</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="bulk | cut | maintain"
                  value={goalForm.goal_type}
                  onChange={(e) =>
                    setGoalForm((s) => ({ ...s, goal_type: e.target.value }))
                  }
                />
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  value={goalForm.start_date}
                  onChange={(e) =>
                    setGoalForm((s) => ({ ...s, start_date: e.target.value }))
                  }
                />
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  value={goalForm.end_date}
                  onChange={(e) =>
                    setGoalForm((s) => ({ ...s, end_date: e.target.value }))
                  }
                />
                <input
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="priority muscles (comma separated)"
                  value={goalForm.priority_muscle_groups}
                  onChange={(e) =>
                    setGoalForm((s) => ({ ...s, priority_muscle_groups: e.target.value }))
                  }
                />
                {goalErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {goalErrors.join(" ")}
                  </div>
                )}
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitGoal}
                >
                  Save Goal
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
                    <p className="text-white">{g.goal_type}</p>
                    <p className="text-mist/70">
                      {g.start_date} → {g.end_date || "open"}
                    </p>
                    <p className="text-mist/70">
                      {g.priority_muscle_groups?.join(", ") || "no priorities"}
                    </p>
                    <p className="text-xs text-ember">
                      {g.is_active ? "active" : "inactive"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "plans" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Programs</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Program name"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                />
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitProgram}
                >
                  Create Program
                </button>
                {planErrors.length > 0 && (
                  <div className="rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                    {planErrors.join(" ")}
                  </div>
                )}
                <div className="text-sm text-mist/70">Programs:</div>
                {(programs || []).map((p) => (
                  <button
                    key={p.id}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      programId === p.id ? "bg-ember/20" : "bg-slate/40"
                    }`}
                    onClick={() => setProgramId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Days & Exercises</h2>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Day name (e.g. Monday)"
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                />
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitDay}
                >
                  Add Day
                </button>
                <input
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Program day id"
                  value={dayId || ""}
                  onChange={(e) => setDayId(Number(e.target.value))}
                />
                <div className="grid gap-2 text-sm">
                  <select
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    value={exerciseForm.exercise_type}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, exercise_type: e.target.value }))
                    }
                  >
                    {EXERCISE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Exercise name"
                    value={exerciseForm.exercise_name}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, exercise_name: e.target.value }))
                    }
                  />
                  <select
                    className="rounded-lg bg-slate/40 px-3 py-2"
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
                  <select
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    value={exerciseForm.equipment}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, equipment: e.target.value }))
                    }
                  >
                    {EQUIPMENT.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Target sets"
                    value={exerciseForm.target_sets}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, target_sets: Number(e.target.value) }))
                    }
                  />
                  <input
                    type="number"
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Target reps"
                    value={exerciseForm.target_reps}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, target_reps: Number(e.target.value) }))
                    }
                  />
                  <input
                    type="number"
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Target weight kg"
                    value={exerciseForm.target_weight_kg}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, target_weight_kg: Number(e.target.value) }))
                    }
                  />
                  <input
                    type="number"
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Target duration minutes (cardio)"
                    value={exerciseForm.target_duration_minutes}
                    onChange={(e) =>
                      setExerciseForm((s) => ({
                        ...s,
                        target_duration_minutes: Number(e.target.value)
                      }))
                    }
                  />
                  <button
                    className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                    onClick={submitExercise}
                  >
                    Add Exercise
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "workouts" && (
          <section className="grid gap-6">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Log Workout</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  type="date"
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  value={workoutForm.date}
                  onChange={(e) =>
                    setWorkoutForm((s) => ({ ...s, date: e.target.value }))
                  }
                />
                <input
                  type="number"
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Duration minutes"
                  value={workoutForm.duration_minutes}
                  onChange={(e) =>
                    setWorkoutForm((s) => ({ ...s, duration_minutes: Number(e.target.value) }))
                  }
                />
                <input
                  type="number"
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Fatigue 1-10"
                  value={workoutForm.subjective_fatigue}
                  onChange={(e) =>
                    setWorkoutForm((s) => ({ ...s, subjective_fatigue: Number(e.target.value) }))
                  }
                />
                <input
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Quality: bad | ok | great"
                  value={workoutForm.workout_quality}
                  onChange={(e) =>
                    setWorkoutForm((s) => ({ ...s, workout_quality: e.target.value }))
                  }
                />
                <input
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Program day id"
                  value={workoutForm.program_day_id}
                  onChange={(e) =>
                    setWorkoutForm((s) => ({ ...s, program_day_id: e.target.value }))
                  }
                />
              </div>
              {workoutErrors.length > 0 && (
                <div className="mt-4 rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">
                  {workoutErrors.join(" ")}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {workoutExercises.map((ex, idx) => (
                  <div key={idx} className="grid gap-2 md:grid-cols-7">
                    <input
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Exercise"
                      value={ex.exercise_name}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], exercise_name: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    />
                    <select
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      value={ex.exercise_type}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], exercise_type: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    >
                      {EXERCISE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      value={ex.muscle_group || ""}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], muscle_group: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    >
                      {MUSCLE_GROUPS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      value={ex.equipment || ""}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], equipment: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    >
                      {EQUIPMENT.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Sets"
                      value={ex.set_number}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], set_number: Number(e.target.value) };
                        setWorkoutExercises(next);
                      }}
                    />
                    <input
                      type="number"
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Reps"
                      value={ex.reps || 0}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], reps: Number(e.target.value) };
                        setWorkoutExercises(next);
                      }}
                    />
                    <input
                      type="number"
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Weight kg"
                      value={ex.weight_kg || 0}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], weight_kg: Number(e.target.value) };
                        setWorkoutExercises(next);
                      }}
                    />
                    <input
                      type="number"
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Duration min (cardio)"
                      value={ex.duration_minutes || 0}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], duration_minutes: Number(e.target.value) };
                        setWorkoutExercises(next);
                      }}
                    />
                  </div>
                ))}
                <button
                  className="rounded-lg bg-slate/50 px-4 py-2 text-sm"
                  onClick={() =>
                    setWorkoutExercises((prev) =>
                      prev.concat({
                        exercise_name: "",
                        set_number: 1,
                        exercise_type: "strength",
                        muscle_group: MUSCLE_GROUPS[0],
                        equipment: EQUIPMENT[0],
                        reps: 10,
                        weight_kg: 0,
                        duration_minutes: 0
                      })
                    )
                  }
                >
                  Add Exercise Row
                </button>
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={submitWorkout}
                >
                  Save Workout
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-white">
                  Last Results For Program Day
                </h2>
                <div className="flex items-center gap-2 text-xs text-mist/70">
                  Sort:
                  <select
                    className="rounded-md bg-slate/40 px-2 py-1"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="muscle">Muscle</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  className="rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Program day id"
                  value={lastQueryDayId}
                  onChange={(e) => setLastQueryDayId(e.target.value)}
                />
                <button
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-ink"
                  onClick={fetchLast}
                >
                  Load
                </button>
                {lastResult?.workout?.id && (
                  <button
                    className="rounded-lg bg-ember/20 px-4 py-2 text-sm text-ember"
                    onClick={deleteLastWorkout}
                  >
                    Delete Workout
                  </button>
                )}
              </div>

              {lastResult?.workout ? (
                <div className="mt-6">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-mist/70">
                    <span>
                      Date: <strong className="text-white">{lastResult.workout.date}</strong>
                    </span>
                    <span>
                      Quality: <strong className="text-white">{lastResult.workout.workout_quality}</strong>
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {sortedExercises.map((ex, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate/60 bg-slate/40 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-white">{ex.exercise_name}</p>
                          <span className="text-xs text-ember">{ex.exercise_type}</span>
                        </div>
                        <p className="mt-1 text-xs text-mist/70">
                          {ex.muscle_group || "no muscle group"} · {ex.equipment || "no equipment"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-mist/80">
                          <span>Set: {ex.set_number}</span>
                          {ex.exercise_type === "cardio" ? (
                            <span>Duration: {ex.duration_minutes} min</span>
                          ) : (
                            <>
                              <span>Reps: {ex.reps}</span>
                              <span>Weight: {ex.weight_kg} kg</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-mist/60">No data loaded yet.</p>
              )}
            </div>
          </section>
        )}

        {tab === "nutrition" && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate/60 bg-coal/70 p-6">
              <h2 className="font-display text-xl text-white">Log Nutrition</h2>
              <div className="mt-4 space-y-3">
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  value={nutritionForm.date}
                  onChange={(e) =>
                    setNutritionForm((s) => ({ ...s, date: e.target.value }))
                  }
                />
                <input
                  type="number"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Calories"
                  value={nutritionForm.calories}
                  onChange={(e) =>
                    setNutritionForm((s) => ({ ...s, calories: Number(e.target.value) }))
                  }
                />
                <input
                  type="number"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Protein (g)"
                  value={nutritionForm.protein_g}
                  onChange={(e) =>
                    setNutritionForm((s) => ({ ...s, protein_g: Number(e.target.value) }))
                  }
                />
                <input
                  type="number"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Fat (g)"
                  value={nutritionForm.fat_g}
                  onChange={(e) =>
                    setNutritionForm((s) => ({ ...s, fat_g: Number(e.target.value) }))
                  }
                />
                <input
                  type="number"
                  className="w-full rounded-lg bg-slate/40 px-3 py-2"
                  placeholder="Carbs (g)"
                  value={nutritionForm.carbs_g}
                  onChange={(e) =>
                    setNutritionForm((s) => ({ ...s, carbs_g: Number(e.target.value) }))
                  }
                />
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
