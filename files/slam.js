const rclnodejs = require('rclnodejs');
const Twist = rclnodejs.require('geometry_msgs/msg/Twist');
const Vector3 = rclnodejs.require('geometry_msgs/msg/Vector3');


let node;
let mapSubscription;
let cmdVelPublisher;


async function startslamServer(ws) {
  try {
    await rclnodejs.init();
    node = new rclnodejs.Node('slam_node');
    let latestMapData = null;
    console.log('slam');
    cmdVelPublisher = node.createPublisher(
      'geometry_msgs/msg/Twist',
      '/cmd_vel'
  );
  ws.on('message', function incoming(msg) {
    try {
      const data = JSON.parse(msg);
      if (data.command && data.command!="stop") {
        handleManualControlMessage(msg);
    } 
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

    const fetchInitialData = async () => {
      const initialMapSubscription = node.createSubscription(
        'nav_msgs/msg/OccupancyGrid',
        '/map',
        (message) => {
          latestMapData = message;
          console.log('Fetched initial map data');
          node.destroySubscription(initialMapSubscription);
        }
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    await fetchInitialData();

    mapSubscription = node.createSubscription(
      'nav_msgs/msg/OccupancyGrid',
      '/map',
      (message) => {
        latestMapData = message;
        console.log('Received new map data');
      }
    );

    const dataInterval = setInterval(() => {
      if (latestMapData) {
        ws.send(JSON.stringify({ type: 'mapData', data: latestMapData }));
      }
    }, 50);

    ws.on('close', function close() {
      console.log('WebSocket connection closed.');
      clearInterval(dataInterval);
    });

    rclnodejs.spin(node);

  } catch (error) {
    console.error('Failed to start SLAM server:', error);
  }
}
function handleManualControlMessage(msg) {
    const data = JSON.parse(msg);
    console.log("in handle");
    switch (data.command) {
        case 'forward':
            sendCommand(1.0, 0); // Move forward at full speed (adjust as needed)
            break;
        case 'backward':
            sendCommand(-1.0, 0); // Move backward at full speed
            break;
        case 'left':
            sendCommand(0, 1.0); // Turn left at full speed
            break;
        case 'right':
            sendCommand(0, -1.0); // Turn right at full speed
            break;
        default:
            console.warn('Unknown command:', data.command);
    }
}


function sendCommand(linearX, angularZ) {
    const twist = new Twist();
    twist.linear = new Vector3({x: linearX, y: 0, z: 0});
    twist.angular = new Vector3({x: 0, y: 0, z: angularZ});
    cmdVelPublisher.publish(twist);
}
function stopslamServer() {
  if (node) {
    node.destroy();
    rclnodejs.shutdown();
    console.log('SLAM server stopped.');
  }
}

module.exports = {
  startslamServer,
  stopslamServer
};
