import { useEffect, useMemo, useState } from "react";

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

type ProgramDay = {
  id: number;
  program_id: number;
  day_name: string;
};

type WorkoutExercise = {
  exercise_name: string;
  set_number: number;
  exercise_type: string;
  muscle_group?: string | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_minutes?: number | null;
};

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
  const [tab, setTab] = useState<"goals" | "plans" | "workouts">("goals");
  const { data: goals, setData: setGoals } = useApi<Goal[]>("/goals", [tab]);
  const { data: programs, setData: setPrograms } = useApi<Program[]>(
    "/programs",
    [tab]
  );

  const [goalForm, setGoalForm] = useState({
    goal_type: "bulk",
    start_date: "",
    end_date: "",
    priority_muscle_groups: ""
  });

  const [programName, setProgramName] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [dayName, setDayName] = useState("");
  const [dayId, setDayId] = useState<number | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    exercise_type: "strength",
    exercise_name: "",
    muscle_group: "",
    target_sets: 3,
    target_reps: 10,
    target_weight_kg: 0,
    target_duration_minutes: 0
  });

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
      muscle_group: "",
      reps: 10,
      weight_kg: 0,
      duration_minutes: 0
    }
  ]);
  const [lastQueryDayId, setLastQueryDayId] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const activeGoal = useMemo(() => goals?.find((g) => g.is_active), [goals]);

  const submitGoal = async () => {
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
    const res = await fetch(`${API_BASE}/programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: programName })
    });
    const data = await res.json();
    setPrograms((programs || []).concat(data));
  };

  const submitDay = async () => {
    if (!programId) return;
    await fetch(`${API_BASE}/programs/${programId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_name: dayName })
    });
  };

  const submitExercise = async () => {
    if (!dayId) return;
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
    const data = await res.json();
    setLastResult(data);
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
              <p className="text-lg text-white">{activeGoal.goal_type}</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex gap-4">
          {["goals", "plans", "workouts"].map((item) => (
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
                  <input
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="strength or cardio"
                    value={exerciseForm.exercise_type}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, exercise_type: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Exercise name"
                    value={exerciseForm.exercise_name}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, exercise_name: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-lg bg-slate/40 px-3 py-2"
                    placeholder="Muscle group"
                    value={exerciseForm.muscle_group}
                    onChange={(e) =>
                      setExerciseForm((s) => ({ ...s, muscle_group: e.target.value }))
                    }
                  />
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

              <div className="mt-6 space-y-4">
                {workoutExercises.map((ex, idx) => (
                  <div key={idx} className="grid gap-2 md:grid-cols-6">
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
                    <input
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Type"
                      value={ex.exercise_type}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], exercise_type: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    />
                    <input
                      className="rounded-lg bg-slate/40 px-3 py-2"
                      placeholder="Muscle"
                      value={ex.muscle_group || ""}
                      onChange={(e) => {
                        const next = [...workoutExercises];
                        next[idx] = { ...next[idx], muscle_group: e.target.value };
                        setWorkoutExercises(next);
                      }}
                    />
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
                        muscle_group: "",
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
              <h2 className="font-display text-xl text-white">
                Last Results For Program Day
              </h2>
              <div className="mt-4 flex gap-3">
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
              </div>
              {lastResult && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-slate/40 p-4 text-xs">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
