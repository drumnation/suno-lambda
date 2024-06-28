#!/bin/bash

# Zip only the index.js file
zip function.zip index.mjs

# Update the Lambda function code
aws lambda update-function-code \
    --function-name SunoSongGeneratorFunction \
    --zip-file fileb://function.zip \
    --region us-west-2 \
    --profile davidmieloch@gmail.com

# Clean up
rm function.zip

echo "Deployment complete"
