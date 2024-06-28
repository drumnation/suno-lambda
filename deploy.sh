#!/bin/bash
zip -r function.zip .
aws lambda update-function-code \
    --function-name SunoSongGeneratorFunction \
    --zip-file fileb://function.zip \
    --region us-west-2 \
    --profile davidmieloch@gmail.com
rm function.zip
