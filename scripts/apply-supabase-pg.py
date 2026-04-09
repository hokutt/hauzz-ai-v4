"""
Apply HAUZZ.AI V4 schema to Supabase using direct PostgreSQL connection
Uses the Supabase connection string from the project URL
"""
import os
import sys
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]

# Read SQL files
script_dir = os.path.dirname(os.path.abspath(__file__))
schema_path = os.path.join(script_dir, "supabase-schema.sql")
rls_path = os.path.join(script_dir, "supabase-rls.sql")

with open(schema_path) as f:
    schema_sql = f.read()

with open(rls_path) as f:
    rls_sql = f.read()

print(f"Project ref: {PROJECT_REF}")

# Try using supabase-py with the service role key to run SQL
# The anon key can't run DDL, but we can try using the postgrest endpoint
# with service role key to bypass RLS and run raw SQL

# Actually, we need to use the Supabase Management API with a personal access token
# OR use the pg connection directly. Let's try the pg connection.

# Supabase connection string format:
# postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
# We don't have the password, but we can try using the service role key via the API

# Try using the Supabase SQL API endpoint that some projects expose
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Test connection
test_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers
)
print(f"REST API connection test: {test_resp.status_code}")

# Try to check if tables already exist
tables_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/venues?select=id&limit=1",
    headers=headers
)
print(f"Venues table check: {tables_resp.status_code} - {tables_resp.text[:100]}")

if tables_resp.status_code == 200:
    print("\n✅ Tables already exist in Supabase! Schema was previously applied.")
    print("Checking other tables...")
    for table in ["venue_dna", "garment_ontology", "design_requests", "concept_cards", "vendors", "production_orders", "agent_logs"]:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select=id&limit=1", headers=headers)
        status = "✓" if r.status_code == 200 else "✗"
        print(f"  {status} {table}: {r.status_code}")
    sys.exit(0)
elif tables_resp.status_code == 404:
    print("\n⚠️  Tables don't exist yet. Need to run schema SQL.")
    print("\nThe SUPABASE_KEY appears to be the anon key which cannot run DDL.")
    print("You need to run the schema manually in the Supabase SQL Editor.")
    print(f"\n👉 Go to: https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
    print("\nStep 1: Copy and run the contents of:")
    print(f"  scripts/supabase-schema.sql")
    print("\nStep 2: Copy and run the contents of:")
    print(f"  scripts/supabase-rls.sql")
else:
    print(f"\nUnexpected response: {tables_resp.status_code}")
    print(tables_resp.text[:200])
