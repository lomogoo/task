-- Supabase Tables for Gantt Master

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table  
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  overview TEXT,
  stakeholders TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Major categories (大分類/工程)
CREATE TABLE major_cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Minor categories (小分類)
CREATE TABLE minor_cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  major_id UUID REFERENCES major_cats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks  
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_id UUID REFERENCES minor_cats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status INTEGER DEFAULT 0, -- 0: 未着手, 1: 進行中, 2: 完了
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_major_cats_project_id ON major_cats(project_id);  
CREATE INDEX idx_minor_cats_major_id ON minor_cats(major_id);
CREATE INDEX idx_tasks_minor_id ON tasks(minor_id);
CREATE INDEX idx_tasks_dates ON tasks(start_date, end_date);

-- Enable Row Level Security (optional, for multi-user support later)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (change this for production!)
CREATE POLICY "Allow all for anon" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON major_cats FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON minor_cats FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON tasks FOR ALL USING (true);
