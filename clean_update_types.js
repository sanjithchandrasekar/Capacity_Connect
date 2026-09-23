import fs from "fs";

let code = fs.readFileSync("src/integrations/supabase/types.ts", "utf8");

const newTables = `      announcements: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      course_feedback: {
        Row: {
          id: string
          course_id: string
          user_id: string
          rating: number
          comments: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          rating: number
          comments?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          rating?: number
          comments?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_modules: {`;

if (!code.includes("announcements: {")) {
  code = code.replace("      scenario_modules: {", newTables);
}

function injectFields(table, block, toInject) {
  const regex = new RegExp("(" + table + ":\\s*\\{.*?\\b" + block + ":\\s*\\{.*?)(        \\})", "s");
  const match = code.match(regex);
  if (match && !match[1].includes("work_experience:")) {
      code = code.replace(regex, "$1" + toInject + "\n$2");
  }
}

const reqFields = "          qualifications: string | null\n          work_experience: string | null\n          interests: string | null";
const optFields = "          qualifications?: string | null\n          work_experience?: string | null\n          interests?: string | null";

injectFields("trainees", "Row", reqFields);
injectFields("trainees", "Insert", optFields);
injectFields("trainees", "Update", optFields);

injectFields("trainers", "Row", reqFields);
injectFields("trainers", "Insert", optFields);
injectFields("trainers", "Update", optFields);

fs.writeFileSync("src/integrations/supabase/types.ts", code);
console.log("Clean update done");
