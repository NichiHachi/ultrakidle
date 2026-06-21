# Ultrakidle

The daily character guessing game for machines.

## IMPORTANT
I will *not* be tracking issues in this repo, since they will most likely all be UI/UX rather than directly related to code. You can instead submit issues through the [discord server](https://discord.gg/6dsMavu6mH). that's where discussion around the game happens

## Quick Start
### Prerequisites
- Docker
- Docker compose
 
### Configuration
All environment variables are stored in `.env.example` for both the React and Supabase services.

To build the app locally, simply copy the example environment files:
```sh
cp .env.example .env
cp ./supabase/.env.example ./supabase/.env 
```

### Building the app
```sh
docker compose up -d
```

- Ultrakidle : `localhost:5173`
- Supabase dashboard : `localhost:8000`

The Supabase docker-compose is based on the [official documentation](https://supabase.com/docs/guides/self-hosting/docker)

(All docker-composes are on *restart unless-stopped* so don't forget to stop everything!)

### Import the database
(Note: The import process is in WIP. In the future, manual imports will no longer be necessary)

Import the db schema
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres < schema.sql
```

Import the data
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres < data/import.sql
```

Select a daily enemy in the classic mode (usable multiple times)
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT pick_daily_enemy();"
```

#### Reset the database

You cannot reset the database by simply stopping the db container. You must delete the `supabase/volumes/db/data` folder (Root access required) **after stopping the services**:
```sh
sudo rm -rf supabase/volumes/db/data
```

### Setup Daily Infernoguessr

In the supabase dashboard SQL editor, insert those values:
```sql
INSERT INTO inferno_daily_sets (game_date)
VALUES (
  NOW()::DATE
)
RETURNING id;
```


```sql
INSERT INTO guilds (guild_id, name)
VALUES (
  1,
  'ikz87'
)
```


```sql
INSERT INTO image_submissions (
  guild_id,
  channel_id,
  message_id,
  discord_user_id,
  discord_name,
  level_id,
  image_url,
  status
)
VALUES (
  1,
  'Huh',
  'Huh',
  'Huh',
  'Nichi Hachi',
  1,
  'Huh',
  'Huh'
)
RETURNING id;
```

Use the inferno_daily_sets and image_submissions id-s to insert the different levels into the daily rounds:

(THE SQL QUERY VALUES NEED TO BE UPDATED WITH THOSE FROM THE PREVIOUS QUERY)
```sql
INSERT INTO inferno_daily_rounds (
  set_id,
  round_number,
  image_submission_id,
  correct_level_id,
  public_image_url
)
VALUES
  (<inferno_daily_sets.id>, 1, <image_submissions.id>, 1, 'https://ultrakill.wiki.gg/images/0-1_Into_the_Fire.webp'),
  (<inferno_daily_sets.id>, 2, <image_submissions.id>, 2, 'https://ultrakill.wiki.gg/images/0-2_The_Meatgrinder.webp'),
  (<inferno_daily_sets.id>, 3, <image_submissions.id>, 3, 'https://ultrakill.wiki.gg/images/0-3_Double_Down.webp'),
  (<inferno_daily_sets.id>, 4, <image_submissions.id>, 4, 'https://ultrakill.wiki.gg/images/0-4_A_One-Machine_Army.webp'),
  (<inferno_daily_sets.id>, 5, <image_submissions.id>, 5, 'https://ultrakill.wiki.gg/images/0-5_Cerberus.webp')
RETURNING *;
```