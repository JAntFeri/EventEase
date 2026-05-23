CREATE TABLE polls (
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

-- 2. Časovni razpon
CREATE TABLE time_slots (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE polls ADD CONSTRAINT fk_final_slot FOREIGN KEY (final_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL;

-- 3. Glas
CREATE TABLE votes (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    participant_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Možnosti glasovanja
CREATE TABLE vote_options (
    id UUID PRIMARY KEY,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('yes', 'no', 'if_need_be')),
    UNIQUE(vote_id, time_slot_id)
);

CREATE INDEX idx_polls_share_token ON polls(share_token);
CREATE INDEX idx_polls_admin_token ON polls(admin_token);
CREATE INDEX idx_time_slots_poll_id ON time_slots(poll_id);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
