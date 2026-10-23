import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mzmpjdmbmsxhukiwrqfl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bXBqZG1ibXN4aHVraXdycWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDU5MzAsImV4cCI6MjEwNzk4MTkzMH0.DbMGyGenOqYxrsTG14w7iCJXWdWqLwiYNUGsnEyFoMk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)