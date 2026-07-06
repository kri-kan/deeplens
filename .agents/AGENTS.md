# Vayyari Mobile App Development Rules

- **Expo Packager:** The Expo packager for Vayyari (`npx expo start --android`) runs continuously in the background via a systemd user service (`vayyari-expo.service`). 
- **DO NOT run `expo start` manually:** The default port (8081) will already be bound. Do not attempt to start a new packager manually.
- **Interacting with Expo:** The background service runs the packager inside a detached `tmux` session named `expo`. 
  - To view logs or interact with it manually in a terminal, run `tmux attach -t expo`. 
  - To send commands programmatically to the running Expo process (like pressing `r` to reload the app), use: `tmux send-keys -t expo r C-m`.
