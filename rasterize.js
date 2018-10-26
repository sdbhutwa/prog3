/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc

var Eye = new vec3.fromValues(0.5, 0.5, -0.5);    // default Eye position in world space
var lookAtVector = new vec3.fromValues(0, 0, 1);        // look at vector
var upVector = new vec3.fromValues(0, 1, 0);        // view up vector

var lightLoc = new vec3.fromValues(-1, 3, -0.5);     // default light location in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

// buffers for vertex shader
var triangleBuffer = 0; // the number of indices in the triangle buffer
var vertexBuffer; // this contains vertex coordinates in triangles
var vtxPosAttrib;
var indexBuffer; // this contains indices into vertexBuffer in triangles
var normalBuffer;  // normals in traingles
var ambientBuffer; // ambient terms in triangles
var diffuseBuffer; // diffuse terms in triangles
var specularBuffer; // specular terms in triangles
var specularExpoBuffer;   // specular exponent in triangles
var modelIdxBuffer;      // index of the model that a vertex belongs to

var viewMatrix = mat4.create();   // view matrix
var projMatrix = mat4.create();   // projection matrix
var transformMatrix = mat4.create();  // transform matrix
var selectedModel = 0.0;              // traingle/ellipsoid model currently selected
var blinnToggle = 1;                    // 1 --> blinn-phong, 0 --> phong
var ambientInc = 0.0;           // increment for ambient weight
var diffuseInc = 0.0;           // increment for diffuse weight
var specularInc = 0.0;          // increment for specular weight
var expInc = 0.0;              // increment for specular exponent

var vtxNormalAttrib;
var ambientAttrib;
var diffuseAttrib;
var specularAttrib;
var specularExpAttrib;
var modelIdxAttrib;
var eyePositionUniform;
var lightLocPositionUniform;
var viewMatrixUniform;
var projMatrixUniform;
var transformMatrixUniform;
var selectedModelUniform;
var blinnToggleUniform;
var ambientIncUniform;
var diffuseIncUniform;
var specularIncUniform;
var expIncUniform;

// misc global variables
var modelCount = 1.0;
var selectedTriangle = 0.0;
var selectedEllipsoid = 0.0;
var inputTriangles;
var inputEllipsoids;
var modelCenters = {};

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

// set upVector the webGL environment
function setupVectorWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try

    catch(e) {
        console.log(e);
    } // end catch

} // end setupVectorWebGL

// read triangles in, load them into webgl buffers
function loadTriangles(){
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vertexBufferSize = 0; // the number of vertices in the vertex buffer
        var addVertex = []; // vtx coords to add to the coord array
        var idxOffset = vec3.create(); // the index start for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        var normalToAdd = [];   // normals to add to normalArray
        var normalArray = [];   // array of vertex normals
        var ambientArray = [];  // array of ambient terms
        var diffuseArray = [];  // array of diffuse terms
        var specularArray = []; // array of specular terms
        var specularExpArray = [];   // array of specular factors
        var modelIdxArray = [];

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(idxOffset,vertexBufferSize,vertexBufferSize,vertexBufferSize); // upVectordate vertex start
            var ambientTerm = inputTriangles[whichSet].material.ambient;
            var diffuseTerm = inputTriangles[whichSet].material.diffuse;
            var specularTerm = inputTriangles[whichSet].material.specular;
            var specularExp = inputTriangles[whichSet].material.n;
            var center = vec3.create();
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                addVertex = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(addVertex[0],addVertex[1],addVertex[2]);

                normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                normalArray.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);

                ambientArray.push(ambientTerm[0], ambientTerm[1], ambientTerm[2]);
                diffuseArray.push(diffuseTerm[0], diffuseTerm[1], diffuseTerm[2]);
                specularArray.push(specularTerm[0], specularTerm[1], specularTerm[2]);
                specularExpArray.push(specularExp);
                modelIdxArray.push(modelCount);
                vec3.add(center, center, addVertex);
            } 

            // set upVector the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,idxOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vertexBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triangleBuffer += inputTriangles[whichSet].triangles.length; // total number of tris
            //} // end for each triangle set

            vec3.scale(center, center, (1.0/inputTriangles[whichSet].vertices.length));
            modelCenters[modelCount] = center;
            modelCount++;
        }
        // send vertex, normal, colors to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

        normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW);

        ambientBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ambientArray),gl.STATIC_DRAW);

        diffuseBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(diffuseArray),gl.STATIC_DRAW);

        specularBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(specularArray),gl.STATIC_DRAW);

        specularExpoBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, specularExpoBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specularExpArray), gl.STATIC_DRAW);

        modelIdxBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, modelIdxBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelIdxArray), gl.STATIC_DRAW);

        // send the triangle indices to webGL
        indexBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
        triangleBuffer = indexArray.length;
    } // end if triangles found
} // end load triangles

// setupVector the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        varying vec3 fragColor;
        void main(void) {
            gl_FragColor = vec4(fragColor, 1.0);
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;
        attribute vec3 vtxPos;
        attribute vec3 vtxNormal;
        attribute vec3 ambient;
        attribute vec3 diffuse;
        attribute vec3 specular;
        attribute float factor;
        attribute float modelIdx;
        uniform vec3 lightLocPosition;
        uniform vec3 eyePos;
        uniform mat4 vMat;
        uniform mat4 pMat;
        uniform mat4 tMat;
        uniform float selectedModel;
        uniform int blinn;
        uniform float aInc;
        uniform float dInc;
        uniform float sInc;
        uniform float nInc;
        varying vec3 fragColor;
        void main(void) {
            mat4 transform = (modelIdx == selectedModel) ? tMat : mat4(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);  // apply transformation if selected model, identity otherwise
            gl_Position = pMat * vMat * transform * vec4(vtxPos, 1.0);
            vec3 N = vtxNormal;
            vec3 L = normalize(lightLocPosition - vtxPos);
            float NdotL = dot(N, L);
            vec3 V = normalize(eyePos - vtxPos);
            vec3 H = normalize(L+V);
            vec3 R = 2.0*NdotL*N - L;
            // add increments
            vec3 totalA = ambient + ((modelIdx == selectedModel) ? vec3(aInc, aInc, aInc) : vec3(0, 0, 0));
            vec3 totalD = diffuse + ((modelIdx == selectedModel) ? vec3(dInc, dInc, dInc) : vec3(0, 0, 0));
            vec3 totalS = specular + ((modelIdx == selectedModel) ? vec3(sInc, sInc, sInc) : vec3(0, 0, 0));
            float totalFactor = factor + ((modelIdx == selectedModel) ? nInc : 0.0);
            float specCoeff = pow(((blinn==1)?dot(N, H):dot(R, V)), totalFactor); // blinn-phong or phong
            float red = max(0.0, totalA[0]) + max(0.0, totalD[0]*NdotL) + max(0.0, totalS[0] * specCoeff);
            float green = max(0.0, totalA[1]) + max(0.0, totalD[1]*NdotL) + max(0.0, totalS[1] * specCoeff);
            float blue = max(0.0, totalA[2]) + max(0.0, totalD[2]*NdotL) + max(0.0, totalS[2] * specCoeff);
            fragColor = vec3(red, green, blue);
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vtxPosAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vtxPos");
                gl.enableVertexAttribArray(vtxPosAttrib); // input to shader from array

                vtxNormalAttrib =gl.getAttribLocation(shaderProgram, "vtxNormal");
                gl.enableVertexAttribArray(vtxNormalAttrib);

                ambientAttrib = gl.getAttribLocation(shaderProgram, "ambient");
                gl.enableVertexAttribArray(ambientAttrib);

                diffuseAttrib = gl.getAttribLocation(shaderProgram, "diffuse");
                gl.enableVertexAttribArray(diffuseAttrib);

                specularAttrib = gl.getAttribLocation(shaderProgram, "specular");
                gl.enableVertexAttribArray(specularAttrib);

                specularExpAttrib = gl.getAttribLocation(shaderProgram, "factor");
                gl.enableVertexAttribArray(specularExpAttrib);

                modelIdxAttrib = gl.getAttribLocation(shaderProgram, "modelIdx");
                gl.enableVertexAttribArray(modelIdxAttrib);

                lightLocPositionUniform = gl.getUniformLocation(shaderProgram, 'lightLocPosition');
                gl.uniform3fv(lightLocPositionUniform, lightLoc);

                eyePositionUniform = gl.getUniformLocation(shaderProgram, 'eyePos');
                gl.uniform3fv(eyePositionUniform, Eye);

                projMatrixUniform = gl.getUniformLocation(shaderProgram, 'pMat');
                viewMatrixUniform = gl.getUniformLocation(shaderProgram, 'vMat');
                transformMatrixUniform = gl.getUniformLocation(shaderProgram, 'tMat');
                selectedModelUniform = gl.getUniformLocation(shaderProgram, 'selectedModel');
                blinnToggleUniform = gl.getUniformLocation(shaderProgram, 'blinn');
                ambientIncUniform = gl.getUniformLocation(shaderProgram, 'aInc');
                diffuseIncUniform = gl.getUniformLocation(shaderProgram, 'dInc');
                specularIncUniform = gl.getUniformLocation(shaderProgram, 'sInc');
                expIncUniform = gl.getUniformLocation(shaderProgram, 'nInc');

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setupVector shaders

// render the loaded model
function renderTriangles(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // activate and feed buffers into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vtxPosAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
    gl.vertexAttribPointer(vtxNormalAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
    gl.vertexAttribPointer(ambientAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer);
    gl.vertexAttribPointer(diffuseAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
    gl.vertexAttribPointer(specularAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, specularExpoBuffer);
    gl.vertexAttribPointer(specularExpAttrib, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, modelIdxBuffer);
    gl.vertexAttribPointer(modelIdxAttrib, 1, gl.FLOAT, false, 0, 0);

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer); // activate
    gl.drawElements(gl.TRIANGLES, triangleBuffer, gl.UNSIGNED_SHORT,0); // render

} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
    setupVectorWebGL(); // set upVector the webGL environment
    loadTriangles(); // load in the triangles from tri file
    setupShaders(); // setupVector the webGL shaders

    document.onkeydown = handleKeyPress;
    document.onkeyupVector = handleKeyRelease;
    handleEvents(); // draw the triangles using webGL
} // end main

var currentKeys = {};

function handleKeyPress(event){
  currentKeys[event.keyCode] = true;

  if(event.keyCode == 37){                                                      // Left Arrow --> select previous triangle
    selectedTriangle = selectedTriangle-1.0;
    if(selectedTriangle < 0.0)  selectedTriangle = inputTriangles.length - 1;
    selectedModel = selectedTriangle + 1.0;
  }
  if(event.keyCode == 39){                                                      // Right Arrow --> select next triangle
    selectedTriangle = selectedTriangle+1.0;
    if(selectedTriangle == inputTriangles.length)  selectedTriangle = 0.0;
    selectedModel = selectedTriangle + 1.0;
  }
  if(event.keyCode == 32){                                                      // Space --> unselect model
    selectedModel = 0.0;
  }
  if(event.keyCode == 66){                                                      // b --> toggle between phong and blinn-phong
    blinnToggle = (blinnToggle+1)%2;
  }
  if(event.keyCode == 49){                                                      // 1 --> increase ambient weight by 0.1
    ambientInc = (ambientInc+0.1)%1.0
  }
  if(event.keyCode == 50){                                                      // 2 --> increase diffuse weight by 0.1
    diffuseInc = (diffuseInc+0.1)%1.0
  }
  if(event.keyCode == 51){                                                      // 3 --> increase specular weight by 0.1
    specularInc = (specularInc+0.1)%1.0
  }
  if(event.keyCode == 78){                                                      // n --> increase specular exponent by 1
    expInc = (expInc + 1.0)%20.0;
  }
}

function handleKeyRelease(event){
  currentKeys[event.keyCode] = false;
}

function handleEvents(){
  requestAnimationFrame(handleEvents);

  var translateInc = 0.01;
  var rotateInc = glMatrix.toRadian(1);
  var mCenter = modelCenters[selectedModel];

  if(!currentKeys[16] && currentKeys[87]){             // w --> translate forward
    vec3.add(Eye, Eye, [0, 0, translateInc]);
  }
  if(!currentKeys[16] && currentKeys[65]){             // a --> translate left
    vec3.add(Eye, Eye, [translateInc, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[83]){             // s --> translate backward
    vec3.add(Eye, Eye, [0, 0, -translateInc]);
  }
  if(!currentKeys[16] && currentKeys[68]){             // d --> translate right
    vec3.add(Eye, Eye, [-translateInc, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[81]){             // q --> translate up
    vec3.add(Eye, Eye, [0, translateInc, 0]);
  }
  if(!currentKeys[16] && currentKeys[69]){             // e --> translate down
    vec3.add(Eye, Eye, [0, -translateInc, 0]);
  }

  if(currentKeys[16] && currentKeys[87]){             // W --> rotate left around X axis
    vec3.rotateX(lookAtVector, lookAtVector, [0, 0, 0], rotateInc);
    vec3.rotateX(upVector, upVector, [0, 0, 0], rotateInc);
  }
  if(currentKeys[16] && currentKeys[65]){             // A --> rotate left around Y axis
    vec3.rotateY(lookAtVector, lookAtVector, [0, 0, 0], rotateInc);
  }
  if(currentKeys[16] && currentKeys[83]){             // S --> rotate right around X axis
    vec3.rotateX(lookAtVector, lookAtVector, [0, 0, 0], -rotateInc);
    vec3.rotateX(upVector, upVector, [0, 0, 0], -rotateInc);
  }
  if(currentKeys[16] && currentKeys[68]){             // D --> rotate right around Y axis
    vec3.rotateY(lookAtVector, lookAtVector, [0, 0, 0], -rotateInc);
  }

  if(currentKeys[37] || currentKeys[39] || currentKeys[38] || currentKeys[40]){             // Left, Right, up or Down Key --> scale selected model
    ambientInc = 0.0;
    diffuseInc = 0.0;
    specularInc = 0.0;
    expInc = 0.0;

    mat4.identity(transformMatrix);
    mat4.translate(transformMatrix, transformMatrix, mCenter);
    mat4.scale(transformMatrix, transformMatrix, [1.2, 1.2, 1.2]);
    mat4.translate(transformMatrix, transformMatrix, [-mCenter[0], -mCenter[1], -mCenter[2]]);
  }

  if(currentKeys[32]){                                           // Space --> unselect model
    mat4.identity(transformMatrix);
  }

  if(!currentKeys[16] && currentKeys[79]){              // o --> translate selected model forward
    mat4.translate(transformMatrix, transformMatrix, [0, 0, translateInc]);
  }
  if(!currentKeys[16] && currentKeys[75]){              // k --> translate selected model left
    mat4.translate(transformMatrix, transformMatrix, [translateInc, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[76]){              // l --> translate selected model backward
    mat4.translate(transformMatrix, transformMatrix, [0, 0, -translateInc]);
  }
  if(!currentKeys[16] && currentKeys[186]){              // ; --> translate selected model right
    mat4.translate(transformMatrix, transformMatrix, [-translateInc, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[73]){              // i --> translate selected model upVector
    mat4.translate(transformMatrix, transformMatrix, [0, translateInc, 0]);
  }
  if(!currentKeys[16] && currentKeys[80]){              // p --> translate selected model down
    mat4.translate(transformMatrix, transformMatrix, [0, -translateInc, 0]);
  }

  if(currentKeys[16] && (currentKeys[75] || currentKeys[186] || currentKeys[79] || currentKeys[76]
                                || currentKeys[73] || currentKeys[80])){

    mat4.translate(transformMatrix, transformMatrix, mCenter);
    if(currentKeys[79]){                                   // O --> rotate selected model forward around X
        mat4.rotateX(transformMatrix, transformMatrix, rotateInc);
      }
    if(currentKeys[75]){                                   // K --> rotate selected model left around X axis
      mat4.rotateY(transformMatrix, transformMatrix, rotateInc);
    }
    if(currentKeys[76]){                                   // L --> rotate selected model backward around X
        mat4.rotateX(transformMatrix, transformMatrix, -rotateInc);
      }
    if(currentKeys[186]){                                  // : --> rotate selected model right around Y axis
      mat4.rotateY(transformMatrix, transformMatrix, -rotateInc);
    }
    if(currentKeys[73]){                                   // I --> rotate selected model clockwise around Z
      mat4.rotateZ(transformMatrix, transformMatrix, rotateInc);
    }
    if(currentKeys[80]){                                   // P --> rotate selected model counter-clockwise around Z
      mat4.rotateZ(transformMatrix, transformMatrix, -rotateInc);
    }

    mat4.translate(transformMatrix, transformMatrix, [-mCenter[0], -mCenter[1], -mCenter[2]]);
  }

  var center = vec3.create();
  vec3.add(center, Eye, lookAtVector);
  mat4.lookAtVector(viewMatrix, Eye, center, upVector);
  mat4.perspective(projMatrix, glMatrix.toRadian(90), gl.viewportWidth/gl.viewportHeight, 0.1, 100.0);

  gl.uniformMatrix4fv(projMatrixUniform, gl.FALSE, projMatrix);
  gl.uniformMatrix4fv(viewMatrixUniform, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(transformMatrixUniform, gl.FALSE, transformMatrix);
  gl.uniform1f(selectedModelUniform, selectedModel);
  gl.uniform1i(blinnToggleUniform, blinnToggle);
  gl.uniform1f(ambientIncUniform, ambientInc);
  gl.uniform1f(diffuseIncUniform, diffuseInc);
  gl.uniform1f(specularIncUniform, specularInc);
  gl.uniform1f(expIncUniform, expInc);

  renderTriangles();
}
