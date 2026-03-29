// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? "local";
}

// ─── Jumpseat Requests ────────────────────────────────────────────────────────

export async function getRequests() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("jumpseat_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRequest(req) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("jumpseat_requests")
    .insert({
      user_id:        userId,
      type:           req.type,
      flight_number:  req.flightNumber,
      airline:        req.airline,
      origin:         req.origin,
      destination:    req.destination,
      date:           req.date,
      role:           req.role,
      cabin:          req.cabin,
      notes:          req.notes,
      status:         "pending",
      priority_pos:   req.priorityPos   ?? null,
      priority_total: req.priorityTotal ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(id, status) {
  const { error } = await supabase
    .from("jumpseat_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function updateRequestPriority(id, priorityPos, priorityTotal) {
  const { error } = await supabase
    .from("jumpseat_requests")
    .update({ priority_pos: priorityPos, priority_total: priorityTotal })
    .eq("id", id);
  if (error) throw error;
}

// ─── Pass Log ─────────────────────────────────────────────────────────────────

export async function getPassLog() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("pass_log")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPassEntry(entry) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("pass_log")
    .insert({
      user_id:       userId,
      flight_number: entry.flightNumber,
      airline:       entry.airline,
      origin:        entry.origin,
      destination:   entry.destination,
      date:          entry.date,
      cabin:         entry.cabin,
      outcome:       entry.outcome,
      seat:          entry.seat,
      load_pct:      entry.loadPct ?? null,
      notes:         entry.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePassEntry(id) {
  const { error } = await supabase
    .from("pass_log")
    .delete()
    .eq("id", id);
  if (error) throw error;
}