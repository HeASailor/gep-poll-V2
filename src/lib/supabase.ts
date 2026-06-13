import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Session = {
  id: string
  created_by: string
  title: string
  description: string
  room_code: string
  status: 'draft' | 'active' | 'ended'
  current_question_index: number
  created_at: string
  started_at: string | null
  ended_at: string | null
}

export type Question = {
  id: string
  session_id: string
  question_text: string
  question_type: 'mcq' | 'rating' | 'open'
  correct_option_index: number | null
  order_index: number
  timer_seconds: number
  options?: Option[]
}

export type Option = {
  id: string
  question_id: string
  option_text: string
  option_index: number
}

export type Participant = {
  id: string
  session_id: string
  display_name: string
  joined_at: string
}

export type Response = {
  id: string
  question_id: string
  participant_id: string
  session_id: string
  answer_index: number | null
  answer_text: string | null
  rating_value: number | null
  submitted_at: string
}
