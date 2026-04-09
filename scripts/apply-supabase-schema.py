"""
Apply HAUZZ.AI V4 schema and RLS policies to Supabase
Uses the Supabase Management API to run SQL migrations
"""
import os
import requests
import sys

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]

def run_sql_via_management_api(sql: str, label: str) -> bool:
    """Run SQL using Supabase Management API"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    # Try the pg endpoint for direct SQL execution
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=60
    )
    
    print(f"\n[{label}] Status: {resp.status_code}")
    if resp.status_code not in (200, 201, 204):
        print(f"  Error: {resp.text[:300]}")
        return False
    print(f"  ✓ Success")
    return True

def run_sql_via_rest(sql: str, label: str) -> bool:
    """Run SQL using Supabase REST API with service role key"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Split into individual statements and run each
    statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
    
    success_count = 0
    fail_count = 0
    
    for i, stmt in enumerate(statements):
        if not stmt:
            continue
        
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/",
            headers={**headers, "Content-Type": "application/json"},
            json={"query": stmt + ";"}
        )
        
        if resp.status_code in (200, 201, 204):
            success_count += 1
        else:
            fail_count += 1
            if fail_count <= 3:
                print(f"  Statement {i+1} failed ({resp.status_code}): {stmt[:80]}...")
    
    print(f"[{label}] {success_count} succeeded, {fail_count} failed")
    return fail_count == 0

# Read SQL files
schema_path = os.path.join(os.path.dirname(__file__), "supabase-schema.sql")
rls_path = os.path.join(os.path.dirname(__file__), "supabase-rls.sql")

with open(schema_path) as f:
    schema_sql = f.read()

with open(rls_path) as f:
    rls_sql = f.read()

print(f"Project: {PROJECT_REF}")
print(f"Supabase URL: {SUPABASE_URL[:40]}...")
print("\nAttempting schema migration via Management API...")

# Try management API first
schema_ok = run_sql_via_management_api(schema_sql, "Schema")
if schema_ok:
    rls_ok = run_sql_via_management_api(rls_sql, "RLS Policies")
    if rls_ok:
        print("\n✅ Schema and RLS policies applied successfully via Management API!")
        sys.exit(0)

print("\nManagement API failed. Trying alternative approach via supabase-py...")

# Try using supabase-py client
try:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Try executing via RPC if there's a custom function
    result = supabase.rpc("exec_sql", {"query": "SELECT 1"}).execute()
    print(f"RPC test: {result}")
except Exception as e:
    print(f"supabase-py approach failed: {e}")

print("\n⚠️  Direct SQL execution via API is not available with the anon key.")
print("Please run the SQL files manually in the Supabase SQL Editor:")
print(f"  1. Go to: https://supabase.com/dashboard/project/{PROJECT_REF}/sql")
print(f"  2. Run: scripts/supabase-schema.sql")
print(f"  3. Run: scripts/supabase-rls.sql")
