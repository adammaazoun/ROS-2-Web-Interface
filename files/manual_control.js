const rclnodejs = require('rclnodejs');
const Twist = rclnodejs.require('geometry_msgs/msg/Twist');
const Vector3 = rclnodejs.require('geometry_msgs/msg/Vector3');

let node;
let cmdVelPublisher;

async function startManualControl(ws) {
    try {
        await rclnodejs.init();
        node = new rclnodejs.Node('control_node');
        console.log('start manual control:p');
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

        rclnodejs.spin(node);
    } catch (error) {
        console.error('Failed to start manual control:', error);
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

function stopManualControl() {
    if (node) {
        node.destroy();
        rclnodejs.shutdown();
        console.log('Manual control server stopped.');
    }
    else{
        console.log("no server to stop");
    
      }
}

module.exports = {
    startManualControl,
    stopManualControl
};
