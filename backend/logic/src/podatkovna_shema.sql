CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organizer_email VARCHAR(255) NOT NULL,
    admin_token UUID UNIQUE,
    share_token UUID UNIQUE,
    is_finalized BOOLEAN DEFAULT FALSE,
    final_slot_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_final_slot' AND conrelid = 'polls'::regclass
    ) THEN
        ALTER TABLE polls ADD CONSTRAINT fk_final_slot
            FOREIGN KEY (final_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    participant_name VARCHAR(100) NOT NULL,
    participant_email VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add participant_email column if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'votes' AND column_name = 'participant_email'
    ) THEN
        ALTER TABLE votes ADD COLUMN participant_email VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS vote_options (
    id UUID PRIMARY KEY,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('yes', 'no', 'if_need_be')),
    UNIQUE(vote_id, time_slot_id)
);

CREATE TABLE IF NOT EXISTS slot_suggestions (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    suggested_by VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_polls_share_token ON polls(share_token);
CREATE INDEX IF NOT EXISTS idx_polls_admin_token ON polls(admin_token);
CREATE INDEX IF NOT EXISTS idx_time_slots_poll_id ON time_slots(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
