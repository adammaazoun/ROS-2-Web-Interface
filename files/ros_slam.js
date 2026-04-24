let socket;
let mode = "none";
let mapResolution = 0.05; // Default resolution, will be updated when map is received
let mapOriginX = 0;
let mapOriginY = 0;
let mapWidth = 0;
let mapHeight = 0;
let lastMapMessage;

document.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();
  const canvas = document.getElementById("mapCanvas");

  document.getElementById("launch").addEventListener("click", () => {
    mode = "launch"; 
    socket.send(JSON.stringify({ command: 'start_slam' }));
    
  });
  document.getElementById("stop").addEventListener("click", () => {
    socket.send(JSON.stringify({ command: 'stop_slam' }));
  });
  document.getElementById("save").addEventListener("click", () => {
    const mapFile = document.getElementById('map').value;
    socket.send(JSON.stringify({ command: 'save_slam',mapFile }));
  });

  document.getElementById("launch").addEventListener("click", function () {        
    socket.send(JSON.stringify({ command: 'start_controll' }));
  });
  document.getElementById("stop").addEventListener('click', function () {
    socket.send(JSON.stringify({ command: "stop"}));
});

document.getElementById('forwardBtn').addEventListener('mouseup', function () {
  clearInterval(commandInterval);    });

document.getElementById('backwardBtn').addEventListener('mouseup', function () {
  clearInterval(commandInterval);    });

document.getElementById('leftBtn').addEventListener('mouseup', function () {
  clearInterval(commandInterval);    });

document.getElementById('rightBtn').addEventListener('mouseup', function () {
  clearInterval(commandInterval);    });

document.getElementById('forwardBtn').addEventListener('mousedown', function () {

    socket.send(JSON.stringify({ command: "forward"}));
    commandInterval = setInterval(() => {
        socket.send(JSON.stringify({ command: 'forward' }));
    }, 50);
    
});

document.getElementById('backwardBtn').addEventListener('mousedown', function () {
    socket.send(JSON.stringify({ command: "backward"}));
    commandInterval = setInterval(() => {
        socket.send(JSON.stringify({ command: 'backward' }));
    }, 50);
});

document.getElementById('leftBtn').addEventListener('mousedown', function () {
    socket.send(JSON.stringify({ command: "left"}));
    commandInterval = setInterval(() => {
        socket.send(JSON.stringify({ command: 'left' }));
    }, 50);
});

document.getElementById('rightBtn').addEventListener('mousedown', function () {
    socket.send(JSON.stringify({ command: "right"}));
    commandInterval = setInterval(() => {
        socket.send(JSON.stringify({ command: 'right' }));
    }, 50);

}); 





  
  
});



function connectWebSocket() {
  socket = new WebSocket('ws://192.168.0.54:3000');
  socket.onopen = () => {
    console.log('Connected to server');
    updateVariableDisplay();
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'mapData':
        handleMapMessage(message.data);
        break;
      case 'robotPose':
        handleRobotPose(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
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


function handleRobotPose(message) {
        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d");
        const robotX = message.pose.pose.position.x;
        const robotY = message.pose.pose.position.y;
        const orientation = message.pose.pose.orientation;

        const canvasRobotX = mapOriginX + robotX / mapResolution;
        const canvasRobotY = (mapOriginY  - robotY / mapResolution );
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
      
      

