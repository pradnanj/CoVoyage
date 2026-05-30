#!/usr/bin/env bash
# CoVoyage DynamoDB Reset Script
# Usage: bash scripts/reset-db.sh [region]
# Reads AWS credentials from environment variables or .env.local in project root.

REGION=${1:-us-east-2}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

# Load .env.local if present and credentials not already in environment
if [ -f "$ENV_FILE" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
  while IFS='=' read -r key val; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key="${key//VITE_/}"  # strip VITE_ prefix
    export "$key=$val"
  done < "$ENV_FILE"
fi

echo "⚠️  This will DELETE ALL ITEMS from all CoVoyage DynamoDB tables in $REGION"
read -rp "Type RESET to continue: " confirm
if [ "$confirm" != "RESET" ]; then echo "Aborted."; exit 1; fi

python3 - "$REGION" <<'PYEOF'
import sys, os, boto3
from botocore.config import Config

region = sys.argv[1] if len(sys.argv) > 1 else 'us-east-2'
access_key = os.environ.get('AWS_ACCESS_KEY_ID')
secret_key  = os.environ.get('AWS_SECRET_ACCESS_KEY')

if not access_key or not secret_key:
    print('✗  AWS credentials not found. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or ensure .env.local is present.')
    sys.exit(1)

dynamodb = boto3.resource(
    'dynamodb', region_name=region,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(retries={'max_attempts': 3})
)

TABLES = [
    ('CrewfareTrips',      'tripId',      None),
    ('CrewfareMembers',    'memberId',    'tripId'),
    ('CrewfareHotels',     'hotelId',     'tripId'),
    ('CrewfareActivities', 'activityId',  'tripId'),
]

total = 0
for table_name, pk, sk in TABLES:
    print(f'\n🗑  Clearing {table_name}...')
    try:
        table = dynamodb.Table(table_name)
        scan_kwargs = {}
        items = []
        while True:
            response = table.scan(**scan_kwargs)
            items.extend(response.get('Items', []))
            last = response.get('LastEvaluatedKey')
            if not last:
                break
            scan_kwargs['ExclusiveStartKey'] = last

        if not items:
            print('   (empty — nothing to delete)')
            continue

        deleted = 0
        with table.batch_writer() as batch:
            for item in items:
                key = {pk: item[pk]}
                if sk and sk in item:
                    key[sk] = item[sk]
                batch.delete_item(Key=key)
                deleted += 1

        print(f'   ✓ Deleted {deleted} items')
        total += deleted
    except Exception as e:
        print(f'   ✗ Error: {e}')

print(f'\n✅  Done. Total deleted: {total} items.')
PYEOF
