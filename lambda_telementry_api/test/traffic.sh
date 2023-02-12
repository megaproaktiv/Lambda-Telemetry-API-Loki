#!/bin/bash
export BUCKET=`aws cloudformation describe-stacks --stack-name LambdaTelementryApiStack --query "Stacks[?StackName == 'LambdaTelementryApiStack'][].Outputs[?OutputKey == 'Bucket'].OutputValue" --output text`
for i in 0 1 2 3 4 5 6 7 8 9 
do
    for k in 0 1 2 3 4 5 6 7 8 9
    do
        for k in 0 1 2 3 4 5 6 7 8 9
        do
            date
            aws s3 cp readme.md s3://${BUCKET}//test-4-${i}-${k}-${l}
            sleep 1
        done
    done
done
