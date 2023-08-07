const socket = io(ENV.SERVER_URL,{
    path:'/api/socket.io/'
});

let localStream=null;
let remoteStream=null;
let peerConnection;
let guserid;
let groomid;

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
        },
    ],
}

async function joinRoom(){
    const local = document.getElementById('local');
    const roomid = document.getElementById('roomid').value;
    const startcall = document.getElementById('startcall');
    const userid = document.getElementById('userid').value;

    guserid = userid;
    groomid = roomid;

    if(roomid === '' || userid === ''){
        alert("Please enter all fields")
        return;
    }
    localStream = await navigator.mediaDevices.getUserMedia({video:{width:200,height:200},audio:true});

    local.srcObject = localStream;
    startcall.disabled = false;

    socket.emit('joinRoom',roomid,userid);
    document.getElementById('roomid').value = '';
    document.getElementById('userid').value = '';
}

function leaveRoom(){
    peerConnection.close();
    peerConnection = null;
    document.getElementById('remote').srcObject = null;
    socket.emit('signalingMessage',{type:'hangup'},groomid);
}

function startCall(){
    const remote = document.getElementById('remote');
    const userid = guserid;
    const roomid = groomid;

    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
    
    peerConnection.ontrack = event =>{
        remoteStream = event.streams[0];
        remote.srcObject = remoteStream;
        document.getElementById('hangup').disabled=false;
    }

    peerConnection.onicecandidate = event => {
        if(event.candidate){
            socket.emit('signalingMessage',{candidate:event.candidate},roomid)
        }
    }

    peerConnection.createOffer().then(offer=>{
        peerConnection.setLocalDescription(offer);
        socket.emit('signalingMessage',{offer},roomid);
    })
}

socket.on('signalingMessage',async ([message,roomid])=>{

    const remote = document.getElementById('remote');

    if(message.offer){
        peerConnection = new RTCPeerConnection(servers);
        localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
        
        peerConnection.ontrack = event =>{
            remoteStream = event.streams[0];
            remote.srcObject = remoteStream;
            document.getElementById('hangup').disabled=false;
        }
        
        await peerConnection.setRemoteDescription(message.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signalingMessage',{answer},roomid);

        peerConnection.onicecandidate = event=>{
            if(event.candidate){
                socket.emit('signalingMessage',{candidate:event.candidate},roomid);
            }
        }

    } else if(message.answer){
        await peerConnection.setRemoteDescription(message.answer);
    } else if(message.candidate){
        await peerConnection.addIceCandidate(message.candidate);
    } else if(message.type === 'hangup'){
        peerConnection.close();
        peerConnection = null;
        document.getElementById('remote').srcObject = null;
    }
})

socket.on("userList",msg=>{
    
    const cont = document.getElementById('cont');

    const child = document.createElement('div');
    child.textContent = msg;
    child.className = "username";
    cont.appendChild(child);

})

function appendMessage(msg){
    const cont = document.getElementById('cont');

    const child = document.createElement('div');
    child.textContent = msg;
    child.className = "username";
    cont.appendChild(child);
}