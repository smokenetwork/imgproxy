#!/bin/bash

url=""

for i in {100..200}
do
   curl "http://localhost:8000/?width=$i"
done
