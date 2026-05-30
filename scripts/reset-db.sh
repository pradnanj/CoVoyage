#!/bin/bash
# CoVoyage DynamoDB Reset Script
# Usage: bash scripts/reset-db.sh [region]

REGION=${1:-us-east-2}
TABLES=("CrewfareTrips" "CrewfareMembers" "CrewfareHotels" "CrewfareActivities")
PK_MAP=("tripId" "memberId" "hotelId" "activityId")
FLAGS="--no-verify-ssl --region $REGION"

echo "⚠️  This will DELETE ALL ITEMS from all CoVoyage DynamoDB tables in $REGION"
read -rp "Type RESET to continue: " confirm
if [ "$confirm" != "RESET" ]; then echo "Aborted."; exit 1; fi

for i in "${!TABLES[@]}"; do
  TABLE="${TABLES[$i]}"
  PK="${PK_MAP[$i]}"
  echo ""
  echo "🗑  Clearing $TABLE (pk: $PK)..."

  KEYS=$(aws dynamodb scan \
    --table-name "$TABLE" \
    --projection-expression "$PK" \
    --query "Items[*].${PK}.S" \
    --output text $FLAGS 2>/dev/null)

  if [ -z "$KEYS" ]; then
    echo "   (empty — nothing to delete)"
    continue
  fi

  COUNT=0
  for KEY in $KEYS; do
    aws dynamodb delete-item \
      --table-name "$TABLE" \
      --key "{\"$PK\": {\"S\": \"$KEY\"}}" \
      $FLAGS > /dev/null 2>&1
    COUNT=$((COUNT+1))
  done
  echo "   ✓ Deleted $COUNT items"
done

echo ""
echo "✅  All tables cleared."
