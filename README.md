# Tunibot — ROS 2 Web Interface

> 🚧 **Work in Progress** — Core modules are functional. Several frontend pages, helper modules, and configuration files are still under active development.

A browser-based control and monitoring dashboard for a ROS 2 robot. Built with a **Node.js WebSocket server** (using `rclnodejs`) as the bridge between the browser and ROS 2, and a **vanilla HTML/JS + Bootstrap 5** frontend.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [ROS 2 Topics](#ros-2-topics)
- [Pages](#pages)
- [Known Issues & Missing Parts](#known-issues--missing-parts)
- [Roadmap](#roadmap)

---

## Overview

Tunibot replaces a physical controller with a web dashboard. From any browser on the same network as the robot, you can:

- Drive the robot manually using on-screen directional buttons
- Launch SLAM and watch the map build in real time on an HTML canvas
- Send navigation goals and waypoints by clicking directly on the map
- Monitor Nav2 feedback (pose, distance remaining, recovery count, status)
- Read and update navigation parameters without touching the robot

The Node.js server runs **on the robot** (or on the same machine as ROS 2) and uses `rclnodejs` to communicate with the ROS 2 middleware. The browser connects via WebSocket.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│         Browser  (any device on LAN)         │
│                                              │
│  slam.html · navigation.html · parameter.html│
│  manual_control.html · index.html            │
│                                              │
│  ros_slam.js · ros_nav.js · manual_control.js│
└──────────────────┬───────────────────────────┘
                   │  WebSocket  ws://<robot-ip>:3000
                   ▼
┌──────────────────────────────────────────────┐
│      Node.js WebSocket Server  (:3000)       │
│                                              │
│  slam.js        →  SLAM subscriptions        │
│  navigation.js  →  Nav2 subscriptions        │
│  manual_control.js → /cmd_vel publisher      │
│  navfun.js      →  goal / pose publishers    │
└──────────────────┬───────────────────────────┘
                   │  rclnodejs  (ROS 2 DDS)
                   ▼
┌──────────────────────────────────────────────┐
│             ROS 2 Middleware                 │
│                                              │
│  /cmd_vel   /map   /amcl_pose   /plan        │
│  /navigate_to_pose/_action/...               │
│  /diagnostics   /bt_navigator/...            │
└──────────────────────────────────────────────┘
```

---

## Features

### ✅ Implemented

| Feature | Description |
|---|---|
| **Manual Control** | Publishes `geometry_msgs/Twist` to `/cmd_vel` on button hold. Sends commands every 50 ms for smooth movement. |
| **SLAM Mode** | Launches SLAM, streams live `OccupancyGrid` map data to the browser canvas at 20 fps. Robot can be driven during mapping. |
| **Map Visualization** | Renders occupancy grid (free / occupied / unknown) on `<canvas>` with a grid overlay and flipped Y-axis. |
| **Robot Pose Overlay** | Draws the robot icon on the map using `/amcl_pose`, with correct quaternion → yaw conversion. |
| **Goal Pose** | Two-click interaction on the map — first click sets position, second sets orientation from drag direction. |
| **Initial Pose** | Same two-click flow for setting the AMCL initial pose estimate. |
| **Waypoint Mission** | Build an ordered list of waypoints by clicking the map. Start the full mission or step through one at a time. Undo / reset supported. |
| **Path Visualization** | Draws the Nav2 global plan (`/plan`) as a blue line on the map canvas. |
| **Nav2 Feedback Panel** | Shows current pose, navigation time, estimated time remaining, recovery count, and distance remaining. |
| **Goal Status Display** | Maps Nav2 action status codes (1–6) to human-readable labels (accepted / executing / reached / aborted / canceled). Color-coded green/red. |
| **Parameter UI** | Fetches all navigation parameters from `/api/navigation`, renders a nested collapsible form, and POSTs updates back. Supports reset to defaults. |
| **Map Save** | Sends a `save_slam` command with a user-specified filename to trigger map saving on the server. |
| **Auto-reconnect** | WebSocket client retries connection every 5 seconds on disconnect. |

### 🚧 Partially Implemented

| Feature | Status |
|---|---|
| Diagnostics panel | Data received and parsed; `lifecycle` messages filtered — UI element may be missing on some pages |
| BT Navigator transition display | Data received; display element not confirmed in all pages |
| LiDAR scan overlay | `handlescan()` stub present in `ros_nav.js` — not yet implemented |
| Orientation slider | Wired up in navigation page but `sendOrientation` target needs review |

---

## Tech Stack

### Server (runs on robot)
| Technology | Purpose |
|---|---|
| Node.js | WebSocket server runtime |
| `ws` | WebSocket server library |
| `rclnodejs` | ROS 2 Node.js client library |
| `geometry_msgs`, `nav_msgs`, `nav2_msgs`, etc. | ROS 2 message types |

### Frontend (runs in browser)
| Technology | Purpose |
|---|---|
| Vanilla HTML / JS | UI and canvas rendering |
| Bootstrap 5.3 | Layout, navbar, sidebar, cards, buttons |
| Font Awesome 6.4 | Sidebar icons |
| HTML `<canvas>` | Map and robot pose rendering |
| Native WebSocket API | Browser ↔ server communication |

---

## Project Structure

```
tunibot/
│
├── server/                          # Node.js backend (runs on robot)
│   ├── index.js                     # ⚠️  Missing — entry point / WS server setup
│   ├── manual_control.js            # ✅  /cmd_vel publisher, WS message handler
│   ├── slam.js                      # ✅  SLAM map subscriber + cmd_vel publisher
│   ├── navigation.js                # ✅  Nav2 subscriptions, data relay to browser
│   └── navfun.js                    # ⚠️  Missing — publishGoalPose, publishInitialPose
│
├── public/                          # Frontend (served as static files)
│   ├── index.html                   # ⚠️  Missing — home/dashboard page
│   ├── slam.html                    # ✅  SLAM map + manual drive UI
│   ├── navigation.html              # ⚠️  Missing — navigation page HTML
│   ├── manual_control.html          # ⚠️  Missing — standalone manual control page
│   ├── parameter.html               # ✅  Navigation parameter editor
│   │
│   ├── ros_slam.js                  # ✅  Browser JS for SLAM page
│   ├── ros_nav.js                   # ✅  Browser JS for Navigation page
│   ├── script/
│   │   └── ros_controll.js          # ⚠️  Missing — referenced in parameter.html
│   ├── client.js                    # ⚠️  Missing — referenced in parameter.html
│   │
│   └── img/
│       ├── map.png                  # ⚠️  Missing — robot icon rendered on canvas
│       └── arr1.png                 # ⚠️  Missing — goal / waypoint arrow icon
│
└── .env.example                     # ⚠️  Not yet created — see Configuration
```

---

## Prerequisites

- **ROS 2** Humble or later — installed and sourced on the robot machine
- **Nav2** stack: `sudo apt install ros-<distro>-navigation2 ros-<distro>-nav2-bringup`
- **Node.js** 18+ on the robot machine
- A browser on any device connected to the same network as the robot

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/tunibot.git
cd tunibot
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Set the robot IP

Open `public/ros_slam.js` and `public/ros_nav.js` and update the WebSocket URL:

```js
// ros_slam.js  and  ros_nav.js
socket = new WebSocket('ws://<YOUR_ROBOT_IP>:3000');
```

> A `.env` based approach to avoid editing source files is on the roadmap.

### 4. Source ROS 2 and start the server

```bash
source /opt/ros/<your-distro>/setup.bash
node server/index.js
```

### 5. Open the dashboard

Navigate to `http://<robot-ip>:3000` in any browser on the same network.

---

## Configuration

Currently two values are hardcoded and must be changed manually before use:

| File | Hardcoded Value | What it is |
|---|---|---|
| `public/ros_slam.js` | `ws://192.168.0.54:3000` | WebSocket URL for SLAM page |
| `public/ros_nav.js` | `ws://192.168.1.17:3000` | WebSocket URL for Navigation page |

A `.env.example` is planned:

```env
ROBOT_IP=192.168.1.100
WS_PORT=3000
```

> ⚠️ Add `.env` to your `.gitignore` and never commit real IPs or credentials.

---

## ROS 2 Topics

### Subscribed (server reads → forwards to browser)

| Topic | Message Type | Used In |
|---|---|---|
| `/map` | `nav_msgs/msg/OccupancyGrid` | SLAM, Navigation |
| `/amcl_pose` | `geometry_msgs/msg/PoseWithCovarianceStamped` | Navigation |
| `/plan` | `nav_msgs/msg/Path` | Navigation |
| `/navigate_to_pose/_action/feedback` | `nav2_msgs/action/NavigateToPose_FeedbackMessage` | Navigation |
| `/navigate_to_pose/_action/status` | `action_msgs/msg/GoalStatusArray` | Navigation |
| `/diagnostics` | `diagnostic_msgs/msg/DiagnosticArray` | Navigation |
| `/bt_navigator/transition_event` | `lifecycle_msgs/msg/TransitionEvent` | Navigation |

### Published (browser sends → server publishes to ROS 2)

| Topic | Message Type | Used In |
|---|---|---|
| `/cmd_vel` | `geometry_msgs/msg/Twist` | Manual Control, SLAM |
| `/initialpose` | `geometry_msgs/msg/PoseWithCovarianceStamped` | Navigation (via navfun.js) |
| `/goal_pose` | `geometry_msgs/msg/PoseStamped` | Navigation (via navfun.js) |

---

## Pages

| Page | File | Status | Description |
|---|---|---|---|
| Home | `index.html` | ⚠️ Missing | Dashboard / landing page |
| Navigation | `navigation.html` | ⚠️ Missing | Map, goal setting, Nav2 feedback panel |
| SLAM | `slam.html` | ✅ Present | Live map building + manual drive controls |
| Manual Control | `manual_control.html` | ⚠️ Missing | Standalone directional control pad |
| Parameters | `parameter.html` | ✅ Present | Nav2 parameter viewer and editor |

---

## Known Issues & Missing Parts

- **`navfun.js` is absent** — `navigation.js` requires it for `publishGoalPose`, `publishInitialPose`, and `publishOrientationChange`. The navigation server will crash on startup without it.
- **`index.js` is absent** — there is no server entry point in the repository yet.
- **`ros_controll.js` and `client.js` are absent** — both are `<script>` tags in `parameter.html` and will produce 404 errors.
- **`img/map.png` and `img/arr1.png` are absent** — the robot and goal arrow icons will not render on the canvas.
- **Two different hardcoded robot IPs** — `192.168.0.54` in `ros_slam.js` and `192.168.1.17` in `ros_nav.js`. These need to be unified and externalized to a config file.
- **Syntax error in `ros_nav.js`** — a stray `f` on a standalone line (around line 160) causes a parse error, preventing the navigation page from loading.
- **Typo in `ros_nav.js`** — `message.pose.pose.orientlatestpathtion` should be `message.pose.pose.orientation` in `handleRobotPose`.
- **`handlescan()` bug** — references `pathData` instead of the parameter `Data`.

---

## Roadmap

- [ ] Add `index.js` server entry point with WebSocket routing and mode management
- [ ] Add `navfun.js` with goal pose and initial pose publishers
- [ ] Create `navigation.html` with map canvas, feedback panel, and waypoint list
- [ ] Create `manual_control.html` standalone page
- [ ] Externalize robot IP and port to `.env` / config file
- [ ] Add LiDAR scan (`/scan`) overlay on the navigation map canvas
- [ ] Fix all known bugs listed above
- [ ] Add a real-time connection status indicator in the navbar
- [ ] Add map save confirmation feedback in the SLAM UI

---

<p align="center">Built for Tunibot 🤖 — ROS 2 Humble · Node.js · rclnodejs</p>
