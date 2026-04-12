#!/bin/bash
# Create the unified network for DeepLens services if it doesn't already exist
docker network create deeplens-network || true
