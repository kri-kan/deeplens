# Vayyari Mobile App Development Rules

- **Expo Packager:** The Expo packager for Vayyari (`npx expo start --android`) runs continuously in the background via a systemd user service (`vayyari-expo.service`). 
- **DO NOT run `expo start` manually:** The default port (8081) will already be bound. Do not attempt to start a new packager manually.
- **Interacting with Expo:** The background service runs the packager inside a detached `tmux` session named `expo`. 
  - To view logs or interact with it manually in a terminal, run `tmux attach -t expo`. 
  - To send commands programmatically to the running Expo process (like pressing `r` to reload the app), use: `tmux send-keys -t expo r C-m`.

# Vayyari Store Prelaunch Web App Rules

- **Prelaunch Web App:** The prelaunch SPA runs continuously on port `8085` via a systemd user service (`vayyari-prelaunch.service`).
- **DO NOT run `npm run dev` or `vite` manually on 8085:** Port 8085 will already be bound by the background service.
- **Interacting with Prelaunch:** Runs inside a detached `tmux` session named `prelaunch`.
  - To view live logs: `tmux attach -t prelaunch` (detach with `Ctrl+b d`).
  - To restart service: `systemctl --user restart vayyari-prelaunch.service`.
  - Service file: `/home/krikan/.config/systemd/user/vayyari-prelaunch.service`.
