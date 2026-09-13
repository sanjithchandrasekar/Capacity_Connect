-- Add material_type and url columns to materials table
-- material_type: 'file' (default), 'link', 'video'
-- url: stores the URL for link/video materials

DO $$ 
BEGIN
  -- Add material_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'material_type') THEN
    ALTER TABLE materials ADD COLUMN material_type text NOT NULL DEFAULT 'file';
  END IF;

  -- Add url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'url') THEN
    ALTER TABLE materials ADD COLUMN url text NULL;
  END IF;
END $$;

-- Update existing file materials to have correct type
UPDATE materials SET material_type = 'file' WHERE material_type IS NULL;

-- Safely add the check constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materials_material_type_check'
  ) THEN
    ALTER TABLE materials
      ADD CONSTRAINT materials_material_type_check
      CHECK (material_type IN ('file', 'link', 'video'));
  END IF;
END $$;
