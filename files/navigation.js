const rclnodejs = require('rclnodejs');
const navigation = require('./navfun');
const zlib = require('zlib');
let node;
let mapSubscription;
let robotPoseSubscription;


async function startnavServer(ws) {
  try {
    await rclnodejs.init();
    node = new rclnodejs.Node('navigation_node');
    let latestMapData = null;
    let latestPoseData = null;
    let latestGlobalPlan = null;
    let latestFeedbackStatus = null;
    let latestDiagnostics = null;
    let latestpath = null;
    let latestBtNavigatorTransition = null;
    let lateststatus = null;
    let lastes = null;
    console.log('navigation');

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

      const initialPoseSubscription = node.createSubscription(
        'geometry_msgs/msg/PoseWithCovarianceStamped',
        '/amcl_pose',
        (message) => {
          latestPoseData = message;
          console.log('Fetched initial pose data');
          node.destroySubscription(initialPoseSubscription);
        }
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    await fetchInitialData();

    
  

    node.createSubscription('nav_msgs/msg/Path', '/plan', (msg) => {
      latestpath = msg;
      console.log(msg.poses[0].pose.position);
    });

    node.createSubscription('nav2_msgs/action/NavigateToPose_FeedbackMessage', '/navigate_to_pose/_action/feedback',
       (message) => {
      latestFeedbackStatus = message;
    });
  
    // Subscribe to /diagnostics
    node.createSubscription('diagnostic_msgs/msg/DiagnosticArray', '/diagnostics', 
      (message) => {
      latestDiagnostics = message;
      console.log('Received diagnostics data');
    });
  
    // Subscribe to /bt_navigator/transition_event
    node.createSubscription('lifecycle_msgs/msg/TransitionEvent', '/bt_navigator/transition_event', 
      (message) => {
      latestBtNavigatorTransition = message;
      console.log('Received BT Navigator transition event:', message.data);
    });
    
    node.createSubscription('action_msgs/msg/GoalStatusArray',
      '/navigate_to_pose/_action/status',
      (msg) => {
        lateststatus=msg;
      }
    );

    mapSubscription = node.createSubscription(
      'nav_msgs/msg/OccupancyGrid',
      '/map',
      (message) => {
        latestMapData = message;
        console.log('Received new map data');
      }
    );

    robotPoseSubscription = node.createSubscription(
      'geometry_msgs/msg/PoseWithCovarianceStamped',
      '/amcl_pose',
      (message) => {
        latestPoseData = message;
        console.log('Received new robot pose data');
      }
    );

    
    const dataInterval = setInterval(() => {
      if (latestMapData) {
        ws.send(JSON.stringify({ type: 'mapData', data: latestMapData }));
      }
      if (latestPoseData) {
        ws.send(JSON.stringify({ type: 'robotPose', data: latestPoseData }));

      }
      if (latestFeedbackStatus) {

        ws.send(JSON.stringify({ type: 'feedback', data: latestFeedbackStatus }));
      }
      if (latestDiagnostics) {
        ws.send(JSON.stringify({ type: 'diagnostics', data: latestDiagnostics }));
      }
      
      if (latestBtNavigatorTransition) {
        

        ws.send(JSON.stringify({ type: 'btNavigatorTransition', data: latestBtNavigatorTransition }));
      }
      if (lateststatus) {
        console.log(lateststatus.status_list[0].status);
        ws.send(JSON.stringify({ type: 'status', data: lateststatus }));
      }
      if (latestpath) {
        ws.send(JSON.stringify({ type: 'path', data: latestpath }));
      }
      
    }, 500);
    

    ws.on('message', function incoming(message) {
      try {
        const data = JSON.parse(message);
        if (data.goalPose) {
          navigation.publishGoalPose(node, data.goalPose);
        } else if (data.initialPose) {
          navigation.publishInitialPose(node, data.initialPose);
        } else if (data.orientationChange) {
          navigation.publishOrientationChange(node, data.orientationChange);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    ws.on('close', function close() {
      console.log('WebSocket connection closed.');
      clearInterval(dataInterval);
    });

    rclnodejs.spin(node);

  } catch (error) {
    console.error('Failed to start navigation server:', error);
  }
}

function stopnavServer() {
  if (node) {
    node.destroy();
    rclnodejs.shutdown();
    console.log('Navigation server stopped.');
  }
  
}

module.exports = {
  startnavServer,
  stopnavServer
};
