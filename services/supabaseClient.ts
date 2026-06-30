// SuperApp Supabase client (APP Gallery project: opdotszsldcgwjqtvgul)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://opdotszsldcgwjqtvgul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZG90c3pzbGRjZ3dqcXR2Z3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTMwMTgsImV4cCI6MjA4MzMyOTAxOH0.rD_bjCil2I3nYBlilYUObObR0oUkbDbBQN4mCmtwLXI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
