-- Migration to add destination coordinates to outpass_requests table
-- Run this migration to enable geofencing features

-- Add destination coordinate columns
ALTER TABLE outpass_requests 
ADD COLUMN IF NOT EXISTS destination_latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS destination_longitude NUMERIC(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN outpass_requests.destination_latitude IS 'Optional destination latitude for geofencing';
COMMENT ON COLUMN outpass_requests.destination_longitude IS 'Optional destination longitude for geofencing';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'outpass_requests' 
AND column_name IN ('destination_latitude', 'destination_longitude');
