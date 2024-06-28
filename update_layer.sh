#!/bin/bash

# Zip the node_modules directory
cd node_modules
zip -r ../layer.zip .
cd ..

# Publish a new layer version
NEW_LAYER_VERSION=$(aws lambda publish-layer-version \
    --layer-name SunoSongGeneratorDependencies \
    --description "Dependencies for SunoSongGenerator" \
    --zip-file fileb://layer.zip \
    --compatible-runtimes nodejs20.x \
    --profile davidmieloch@gmail.com \
    --region us-west-2 \
    --query 'Version' \
    --output text)

# Update the function to use the new layer version
aws lambda update-function-configuration \
    --function-name SunoSongGeneratorFunction \
    --layers arn:aws:lambda:us-west-2:417455578392:layer:SunoSongGeneratorDependencies:$NEW_LAYER_VERSION \
    --profile davidmieloch@gmail.com \
    --region us-west-2

# Clean up
rm layer.zip

echo "Layer updated to version $NEW_LAYER_VERSION and function configuration updated"
