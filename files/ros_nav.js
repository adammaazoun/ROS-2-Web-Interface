let socket;
let mode = "none";
let mapResolution = 0.05; // Default resolution, will be updated when map is received
let mapOriginX = 0;
let mapOriginY = 0;
let mapWidth = 0;
let mapHeight = 0;
let lastMapMessage;
let lastpath;
let dragging = false;
let startX, startY;
let lastGoalx ;
let lastGoaly ;
let lastGoalo ;
let waypoints=[];
let mission=false;
let first=true;
let firstp=true;
let firstg=true;
let oldx;
let oldy;
let currentWaypointIndex = 0;
let stat;
document.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();
  const slider = document.getElementById('slider');
  const canvas = document.getElementById("mapCanvas");
  canvas .addEventListener("click", handleCanvasClick);
  document.getElementById("button1").addEventListener("click", () => {
    mode = "goal"; 
    waypoints=[];
    updateVariableDisplay(); 
    document.getElementById("buttonContainer").classList.add("hidden");

    
  });
  document.getElementById("button3").addEventListener("click", () => {
    mode = "waypoint"; 
    waypoints=[];
    updateVariableDisplay(); 
    document.getElementById("buttonContainer").classList.remove("hidden");
    

  });
  document.getElementById("button2").addEventListener("click", () => {
    mode = "pose"; 
    document.getElementById("buttonContainer").classList.add("hidden");
    waypoints=[];
    updateVariableDisplay(); 
  });

  document.getElementById("startw").addEventListener("click", () => {
    startWaypoints();

  });
  document.getElementById("startw1").addEventListener("click", () => {
    navigateToNextWaypoint();
    mission = false;

  });
  document.getElementById("undo").addEventListener("click", () => {
      removelastWaypoint();
      mission = false;

  });
  document.getElementById("reset").addEventListener("click", () => {
    mission = false;
      clearWaypoints();
  });

  document.getElementById("launch").addEventListener("click", () => {
    const mapFile = document.getElementById('map').value;
    mode = "launch"; 
    updateVariableDisplay(); 
    socket.send(JSON.stringify({ command: 'start_navigation', mapFile }));
    
  });
  document.getElementById("stop").addEventListener("click", () => {
    socket.send(JSON.stringify({ command: 'stop_navigation' }));
  });
  
  
  slider.addEventListener('input', updateSliderValue);
  updateSliderValue();

  
  
});


function handleDiagnostics(data) {
  const diagnosticsDataElement = document.getElementById("diagnosticsData");
  if (diagnosticsDataElement) {
    // Assuming data.stat is an array of objects with a 'message' property
    if (data.stat && Array.isArray(data.stat)) {
      const lifecycleMessages = data.stat.filter(stat => stat.name.includes("lifecycle"));
      if (lifecycleMessages.length > 0) {
        diagnosticsDataElement.textContent = lifecycleMessages.map(stat => `${stat.name}: ${stat.message}`).join('\n');
      } else {
        diagnosticsDataElement.textContent = "No lifecycle messages found.";
      }
    } else {
      diagnosticsDataElement.textContent = "No stat data available.";
    }
  } else {
    console.error("Diagnostics element not found.");
  }
}


function handleBtNavigatorTransition(data) {
  const amclTransitionElement = document.getElementById("amclTransition");

  if (!amclTransitionElement) {
    console.error("AMCL Transition element not found.");
    return;
  }

  // Display AMCL transition
  amclTransitionElement.textContent = `AMCL Transition: ${data.transition}`;
}

function handleFeedback(data) {
  // Extract feedback object
  const feedback = data.feedback;

  // Update current pose
  const currentPoseSpan = document.getElementById("currentPose");
  if (currentPoseSpan && feedback.current_pose && feedback.current_pose.pose) {
    const position = feedback.current_pose.pose.position;
    if (position) {
      currentPoseSpan.textContent = `Current Pose: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
    }
  }

  // Update navigation time
  const navigationTimeSpan = document.getElementById("navigationTime");
  if (navigationTimeSpan) {
    navigationTimeSpan.textContent = `${feedback.navigation_time.sec} seconds `;
  }

  // Update estimated time remaining
  const estimatedTimeRemainingSpan = document.getElementById("estimatedTimeRemaining");
  if (estimatedTimeRemainingSpan) {
    estimatedTimeRemainingSpan.textContent = `${feedback.estimated_time_remaining.sec} seconds `;
  }

  // Update number of recoveries
  const numberOfRecoveriesSpan = document.getElementById("numberOfRecoveries");
  if (numberOfRecoveriesSpan) {
    numberOfRecoveriesSpan.textContent = ` ${feedback.number_of_recoveries}`;
  }

  // Update distance remaining
  const distanceRemainingSpan = document.getElementById("distanceRemaining");
  if (distanceRemainingSpan) {
    distanceRemainingSpan.textContent = ` ${feedback.distance_remaining.toFixed(2)} meters`;
  }
}
function handlestatus(msg) {
  const lastStatusIndex = msg.status_list.length - 1;
  const status = msg.status_list[lastStatusIndex].status;

  switch (status) {
      case 4:
        
          document.getElementById('status').textContent = "reached";
          stat = "reached";
          lastGoalx = -30;
          lastGoaly = -30;
          lastGoalo = theta;
          if (mission=== true && waypoints.length>0) {
            navigateToNextWaypoint();
          }
          if (waypoints.length===0) {
            mission = false;
          }
          
          statusElement.classList.remove('status-red');
          statusElement.classList.add('status-green');
         
          document.getElementById('status').textContent = "reached";
          break;
      
      case 1:
          
          document.getElementById('status').textContent = "accepted";
          stat = "accepted";
          statusElement.classList.remove('status-green', 'status-red');

          break;

      case 3:
          
          document.getElementById('status').textContent = "canceling";
          stat = "canceling";
          statusElement.classList.remove('status-green', 'status-red');

          break;

      case 5:
          
          document.getElementById('status').textContent = "canceled";
          stat = "canceled";
          statusElement.classList.remove('status-green', 'status-red');

          break;

      case 2:
          
          
      stat = "executing";
      document.getElementById('status').textContent = "executing";
          statusElement.classList.remove('status-red');
          statusElement.classList.add('status-green');
          break;

      case 6:
        stat = "aborted";

          document.getElementById('status').textContent = "aborted";
          statusElement.classList.remove('status-green');
        statusElement.classList.add('status-red');
          break;

      default:
        statusElement.classList.remove('status-green', 'status-red');

          document.getElementById('status').textContent = "unknown";
          break;
  }
  
}





function updateSliderValue() {
  const size = slider.value;
  document.getElementById('slidervalue').textContent = size;
  sendOrientation(size);
   
}
f

function connectWebSocket() {
  socket = new WebSocket('ws://192.168.1.17:3000');
  socket.onopen = () => {
    console.log('Connected to server');
    updateVariableDisplay();
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type=="mapData") {
      handleMapMessage(message.data);

    }
    if (message.type=="robotPose") {
      handleRobotPose(message.data);
    }
      if (message.type === "status") {
        handlestatus(message.data);
      }
      if (message.type === "feedback") {
        handleFeedback(message.data);
      }
      if (message.type === "diagnostics") {
        handleDiagnostics(message.data);
      }
      
      if (message.type === "btNavigatorTransition") {
        handleBtNavigatorTransition(message.data);
      }
      if (message.type === "path") {
        handlepath(message.data);
      }
      if (message.type === "scan") {
        handlescan(message.data);
      }
    
        console.log('Unknown message type:', message.type);
    
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('Disconnected from server');
    // Optionally, try to reconnect after a delay
    setTimeout(connectWebSocket, 5000);
  };
}

function updateVariableDisplay() {
  document.getElementById("mode").textContent = mode;
  console.log(mode);
}

function handleMapMessage(message) {
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  const width = message.info.width;
  const height = message.info.height;
  const data = message.data;

  canvas.width = width;
  canvas.height = height;

  mapResolution = message.info.resolution;
  mapOriginX = -message.info.origin.position.x / mapResolution;
  mapOriginY = -message.info.origin.position.y / mapResolution * 1.33; // Adjusted origin

  const imgData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const occupancy = data[i];
          let color;

          if (occupancy === 0) {
              color = 190; // White for free space
          } else if (occupancy === 100) {
              color = 60;   // Black for occupied space
          } else {
              color = 127; // Gray for unknown space
          }

          const j = (height - y - 1) * width + x;

          imgData.data[j * 4 + 0] = color; // Red
          imgData.data[j * 4 + 1] = color; // Green
          imgData.data[j * 4 + 2] = color; // Blue
          imgData.data[j * 4 + 3] = 255;   // Alpha
      }
  }  
  

  

  ctx.putImageData(imgData, 0, 0);
  lastMapMessage = message;
  ctx.strokeStyle = '#FFF'; 
  ctx.lineWidth = 0.2;
  for (let x = 0; x < width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
  }
  for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
  }
}



function sendGoalPose(x, y, theta) {
  const goalPose = {
    position: { x: x, y: y, z: 0.0 },
    orientation: eulerToQuaternion(0, 0, theta)
  };

  socket.send(JSON.stringify({ goalPose: goalPose }));
}

function sendGoal(goal) {
  
  socket.send(JSON.stringify({ goalPose: goal}));
}
function sendOrientation(angleInDegrees) {
  const theta = angleInDegrees * (Math.PI / 180);
  const orientation = eulerToQuaternion(0, 0, theta);

  socket.send(JSON.stringify({
    orientationChange: orientation
  }));
}

function sendInitialPose(x, y, theta) {
  const initialPose = {
    position: { x: x, y: y, z: 0.0 },
    orientation: eulerToQuaternion(0, 0, theta)
  };

  socket.send(JSON.stringify({ initialPose: initialPose }));
}

function eulerToQuaternion(roll, pitch, yaw) {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy
  };
}

function quaternionToAngle(quaternion) {
  const { x, y, z, w } = quaternion;
  
  // Calculate yaw (rotation around Z-axis)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return -yaw + 1.57;
}

function quaternionToEuler(quaternion) {
  const { x, y, z, w } = quaternion;
  
  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);
  
  return yaw;
}
function handleRobotPose(message) {
        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d");
        const robotX = message.pose.pose.position.x;
        const robotY = message.pose.pose.position.y;
        const orientation = message.pose.pose.orientlatestpathtion;
        const x=lastGoalx;
        const y=lastGoaly;
        const o=lastGoalo;
        const canvasRobotX = mapOriginX + robotX / mapResolution;
        const canvasRobotY = (mapOriginY  - robotY / mapResolution );
        const cx = mapOriginX + x / mapResolution;
        const cy = (mapOriginY  - y / mapResolution );
        
        Pose(orientation);
        if (lastMapMessage) {
          handleMapMessage(lastMapMessage); 
        }
        
        const image = new Image();
          image.src = 'img/map.png'; 
        image.onload = function() {
          const angle = quaternionToAngle(orientation);
          
          ctx.save();
          ctx.translate(canvasRobotX, canvasRobotY);
          ctx.rotate(angle);
          ctx.drawImage(image, -10, -10, 20, 20);  // Adjusted to center the image
          ctx.restore();
      };
      

      if (lastpath && lastpath.poses && Array.isArray(lastpath.poses)) {
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
    
        console.log('Path data:', lastpath.poses);
    
        let pathPositionsHtml = '<h3>Path Positions:</h3><ul>';
    
        lastpath.poses.forEach((pose, index) => {
          if (pose && typeof pose === 'object') {
            console.log(`Pose ${index}:`, pose);
    
            let x, y;
            if (pose.position) {
              x = pose.position.x;
              y = pose.position.y;
            } else if (pose.pose && pose.pose.position) {
              x = pose.pose.position.x;
              y = pose.pose.position.y;
            } else {
              console.error(`Invalid pose structure at index ${index}:`, pose);
              return; // skip this pose
            }
    
            const pathX = mapOriginX + x / mapResolution;
            const pathY = mapOriginY - y / mapResolution;
    
  
            if (index === 0) {
              ctx.moveTo(pathX, pathY);
            } else {
              ctx.lineTo(pathX, pathY);
            }
          } else {
            console.error(`Invalid pose at index ${index}:`, pose);
          }
        });
    
        ctx.stroke();
      } else {
        console.error('Invalid or no path data available:', lastpath);
      }
      if(x){
        console.log("arr");

        const image2 = new Image();
        image2.src = 'img/arr1.png'; 
      image2.onload = function() {
        //const angle = quaternionToAngle(lastGoalo);
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-o-1.57);//angle);
        ctx.drawImage(image2, -10, -10,20, 20);  // Adjusted to center the image
        ctx.restore();
    };
      }
      waypoints.forEach(( item ,index) =>{ 

        const image3 = new Image();
        image3.src = 'img/arr1.png';
        const wx = mapOriginX + item.position.x / mapResolution;
        const wy = (mapOriginY  - item.position.y / mapResolution );
        const wo=  quaternionToEuler(item.orientation);
        image3.onload = function() {
          //const angle = quaternionToAngle(lastGoalo);
          
          ctx.save();
          ctx.translate(wx, wy);
          ctx.rotate(-wo-1.4);//angle);
          ctx.drawImage(image3, -10, -10,20, 20);  // Adjusted to center the image
          ctx.restore();
      };
       });
         
        
      }
function Pose(orientation) {
        const canvas = document.getElementById("robot_orient");
        const ctx = canvas.getContext("2d");

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const image = new Image();
        image.src = 'img/map.png';

        image.onload = function() {
          const angle = quaternionToAngle(orientation);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(angle);
          ctx.drawImage(image, -100, -100, 200, 200);
          ctx.restore();
        };
      }
      
function handleCanvasClick(event) {
        const canvas = document.getElementById("mapCanvas");
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
      
        const worldX = (x - mapOriginX) * mapResolution;
        const worldY = (mapOriginY - y) * mapResolution; // Invert Y-axis
        
        // Calculate orientation
        
      
        if (mode === "pose" && firstp) {
          oldx=worldX;
          oldy=worldY;
          firstp=false;
          
          
        } 
        else if (mode === "pose" && !firstp) {
          const dx = worldX - oldx;
          const dy = worldY - oldy;
          const theta = Math.atan2(dy, dx);
          sendInitialPose(oldx, oldy, theta);
          firstp=true;
        }
        else if (mode === "waypoint" && first) {
          oldx=worldX;
          oldy=worldY;
          first=false;
          
      } 
      else if (mode === "waypoint" && !first) {
          const dx = worldX - oldx;
          const dy = worldY - oldy;
          const theta = Math.atan2(dy, dx);
          sendGoalwaypoint(oldx, oldy, theta);
          first=true;
          
      }
      else if (mode === "goal" && firstg) {
          oldx=worldX;
          oldy=worldY;
          firstg=false;
          
        }else if (mode === "goal" && !firstg) {
          
          
          const dx = worldX - oldx;
          const dy = worldY - oldy;
          const theta = Math.atan2(dy, dx);
          lastGoalx=oldx;
          lastGoaly=oldy;
          lastGoalo=theta;
          sendGoalPose(oldx, oldy, theta);
          firstg=true;
        }

         
      }
function sendGoalwaypoint(x ,y ,theta) {
        const waypoint = {
          position: { x, y, z: 0.0 },
          orientation: eulerToQuaternion(0, 0, theta)
        };
        waypoints.push(waypoint); // Assuming waypoints is an array
        updateWaypointList();
        
      }
function clearWaypoints() {
        waypoints = [];
        updateWaypointList();
      }
function removelastWaypoint() {
  if (waypoints.length > 0) {
    waypoints.splice(waypoints.length - 1, 1); // Remove the last element
    updateWaypointList();
  } else {
    console.log("No waypoints to remove.");
  }
      }
function updateWaypointList() {
        const waypointList = document.getElementById("waypointList");
        waypointList.innerHTML = "";
        waypoints.forEach((waypoint, index) => {
          const theta = quaternionToEuler(waypoint.orientation);
          const li = document.createElement("li");
          li.textContent = `Waypoint ${index + 1}: (X: ${waypoint.position.x}, Y: ${waypoint.position.y}, Theta: ${theta.toFixed(2)})`;
          waypointList.appendChild(li);
        });
      }
function navigateToNextWaypoint() {
        if (waypoints.length>0) {
          const waypoint = waypoints[0];
          sendGoal(waypoint);
          waypoints.shift(); 
        } else {
          console.log("All waypoints reached.");
        }
      }
function startWaypoints() {
        if (waypoints.length > 0) {
          currentWaypointIndex = 0;
          navigateToNextWaypoint();
          mission=true;
        } else {
          console.log("No waypoints to navigate.");
        }
      }      
function handlepath(pathData) {
  
        lastpath=pathData;
        
    }
function handlescan(Data) {
  
      lastpath=pathData;
      
  }
    