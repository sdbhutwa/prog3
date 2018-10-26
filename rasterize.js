/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

var lookAt = new vec3.fromValues(0, 0, 1); // look at vector
var up = new vec3.fromValues(0, 1, 0);  // view up vector
var light = new vec4.fromValues(-1, 3, -0.5) // light location

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var normalBuffer; // contains normal coordinates in triples
var ambientBuffer; // ambient terms in triangles
var diffuseBuffer; // diffuse terms in triangles
var specularBuffer; // specular terms in triangles
var specularExpBuffer; // specular exponent in triangles
var modelIndexBuffer; //index of the model
var vertexPositionAttrib; // where to put position for vertex shader
var vertexNormalAttrib;
var ambientAttrib;
var diffuseAttrib;
var specularAttrib;
var specularExoAttrib;
var modelIndexAttrib;

var eyePosUniform;
var lightPosUniform;
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
var selectedTri = 0.0;
var inputTriangles;
var modelCenters = {};

var viewMatrix = mat4.create();   // view matrix
var projectionMatrix = mat4.create();   // projection matrix

var transformMatrix = mat4.create();  // transform matrix
var selectedModel = 0.0;              // traingle model currently selected

var blinnToggle = 1;                    // 1 --> blinn-phong, 0 --> phong
var ambientInc = 0.0;           // increment for ambient weight
var diffuseInc = 0.0;           // increment for diffuse weight
var specularInc = 0.0;          // increment for specular weight
var expInc = 0.0;              // increment for specular exponent



// ASSIGNMENT HELPER FUNCTIONS

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
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

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
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        var vtxBufferSize = 0; // number of vertices in buffer
        var normalToAdd = [];   // normals to add to normalArray
        var normalArray = [];   // array of vertex normals
        var ambientArray = [];  // array of ambient terms
        var diffuseArray = [];  // array of diffuse terms
        var specularArray = []; // array of specular terms
        var specularExpArray = [];   // array of specular factors
        var modelIndexArray = []; 
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset, vtxBufferSize, vtxBufferSize, vtxBufferSize); // update vertex
            var ambientTerm = inputTriangles[whichSet].material.ambient;
            var diffuseTerm = inputTriangles[whichSet].material.diffuse;
            var specularTerm = inputTriangles[whichSet].material.specular;
            var specularExp = inputTriangles[whichSet].material.n;
            var center = vec3.create();

            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++){
               // coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
                // console.log(inputTriangles[whichSet].vertices[whichSetVert]);
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                normalArray.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);
                ambientArray.push(ambientTerm[0], ambientTerm[1], ambientTerm[2]);
                diffuseArray.push(diffuseTerm[0], diffuseTerm[1], diffuseTerm[2]);
                specularArray.push(specularTerm[0], specularTerm[1], specularTerm[2]);
                specularExpArray.push(specularExp);
                modelIndexArray.push(modelCount);
  
                vec3.add(center, center, vtxToAdd);
            }
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            }
            vtxBufferSize += inputTriangles[whichSet].vertices.length;
            triBufferSize += inputTriangles[whichSet].triangles.length;
            
            vec3.scale(center, center, (1.0/inputTriangles[whichSet].vertices.length));
            modelCenters[modelCount] = center;
            modelCount++;          
        } // end for each triangle set 
        // console.log(coordArray.length);
        // send the vertex coords to webGL
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

        specularExpBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, specularExpBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specularExpArray), gl.STATIC_DRAW);

        modelIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, modelIndexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelIndexArray), gl.STATIC_DRAW);
        
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
        triBufferSize = indexArray.length;
        
    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        varying vec3 fragColor;
        void main(void) {
            gl_FragColor = vec4(fragColor, 1.0); // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;
        attribute vec3 vertexPosition;
        attribute vec3 ambient;
        attribute vec3 vectorNormal;
        attribute vec3 diffuse;
        attribute vec3 specular;
        attribute float factor;
        attribute float modelIndex;
        uniform vec3 lightPosition;
        uniform vec3 eyePosition;
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
            mat4 transform = (modelIndex == selectedModel) ? tMat : mat4(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1); // apply transformation if selected model, identity otherwise
            gl_Position = vMat * pMat * transform * vec4(vertexPosition, 1.0); // use the untransformed position
            vec3 N = vertexNormal;
            vec3 L = normalize(lightPosition - VertexPosition);
            float NdotL = dot(N, L);
            vec3 V = normalize(eyePosition - vertexPosition);
            vec3 H = normalize(L+V);
            vec3 R = 2.0*NdotL*N - L;
            
            vec3 totalAmbient = ambient + ((modelIndex == selectedModel) ? vec3(aInc, aInc, aInc) : vec3(0, 0, 0));
            vec3 totalDiffuse = diffuse + ((modelIndex == selectedModel) ? vec3(dInc, dInc, dInc) : vec3(0, 0, 0));
            vec3 totalSpecular = specular + ((modelIndex == selectedModel) ? vec3(sInc, sInc, sInc) : vec3(0, 0, 0));
            float totalFactor = factor + ((modelIndex == selectedModel) ? nInc : 0.0);
            float specCoeff = pow(((blinn==1)?dot(N, H):dot(R, V)), totalFactor); // blinn-phong or phong
            float red = max(0.0, totalAmbient[0]) + max(0.0, totalDiffuse[0]*NdotL) + max(0.0, totalSpecular[0] * specCoeff);
            float green = max(0.0, totalAmbient[1]) + max(0.0, totalDiffuse[1]*NdotL) + max(0.0, totalSpecular[1] * specCoeff);
            float blue = max(0.0, totalAmbient[2]) + max(0.0, totalDiffuse[2]*NdotL) + max(0.0, totalSpecular[2] * specCoeff);
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
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                
                vertexNormalAttrib =gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttrib);

                ambientAttrib = gl.getAttribLocation(shaderProgram, "ambient");
                gl.enableVertexAttribArray(ambientAttrib);

                diffuseAttrib = gl.getAttribLocation(shaderProgram, "diffuse");
                gl.enableVertexAttribArray(diffuseAttrib);

                specularAttrib = gl.getAttribLocation(shaderProgram, "specular");
                gl.enableVertexAttribArray(specularAttrib);

                specularExpAttrib = gl.getAttribLocation(shaderProgram, "factor");
                gl.enableVertexAttribArray(specularExpAttrib);

                modelIndexAttrib = gl.getAttribLocation(shaderProgram, "modelIndex");
                gl.enableVertexAttribArray(modelIndexAttrib);

                lightPositionUniform = gl.getUniformLocation(shaderProgram, 'lightPosition');
                gl.uniform3fv(lightPositionUniform, light);

                eyePositionUniform = gl.getUniformLocation(shaderProgram, 'eyePosition');
                gl.uniform3fv(eyePositionUniform, eye);

                projMatrixUniform = gl.getUniformLocation(shaderProgram, 'pMat');
                viewMatrixUniform = gl.getUniformLocation(shaderProgram, 'vMat');
                transformMatrixUniform = gl.getUniformLocation(shaderProgram, 'tMat');
                selectedModelUniform = gl.getUniformLocation(shaderProgram, 'selectedModel');
                blinnToggleUniform = gl.getUniformLocation(shaderProgram, 'blinn');
                ambientIncrementUniform = gl.getUniformLocation(shaderProgram, 'aInc');
                diffuseIncrementUniform = gl.getUniformLocation(shaderProgram, 'dInc');
                specularIncrementUniform = gl.getUniformLocation(shaderProgram, 'sInc');
                expIncrementUniform = gl.getUniformLocation(shaderProgram, 'nInc');
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders
//var bgColor = 0;
// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
   // bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
   // gl.clearColor(bgColor, 0, 0, 1.0);
   // requestAnimationFrame(renderTriangles);
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
     gl.bindBuffer(gl.ARRAY_BUFFER,tNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
    gl.vertexAttribPointer(ambientAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer);
    gl.vertexAttribPointer(diffuseAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
    gl.vertexAttribPointer(specularAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, specularExpBuffer);
    gl.vertexAttribPointer(specularExpAttrib, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, tModelIndexBuffer);
    gl.vertexAttribPointer(modelIndexAttrib, 1, gl.FLOAT, false, 0, 0);

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT,0); // render

} // end render triangles

var currentKeys = {};

function handleKeyDown(event){
  currentKeys[event.keyCode] = true;

  if(event.keyCode == 39){                                                      // Right Arrow --> select next triangle
    selectedTriangle = selectedTriangle+1.0;
    if(selectedTriangle == inputTriangles.length)  selectedTriangle = 0.0;
    selectedModel = selectedTriangle + 1.0;
  }
  if(event.keyCode == 37){                                                      // Left Arrow --> select previous triangle
    selectedTriangle = selectedTriangle-1.0;
    if(selectedTriangle < 0.0)  selectedTriangle = inputTriangles.length - 1;
    selectedModel = selectedTriangle + 1.0;
  if(event.keyCode == 32){                                                      // Space --> unselect model
    selectedModel = 0.0;
  }
  if(event.keyCode == 66){                                                      // b --> toggle between phong and blinn-phong
    blinnToggle = (blinnToggle+1) % 2;
  }

  if(event.keyCode == 49){                                                      // 1 --> increase ambient weight by 0.1
    ambientIncrement = (ambientIncrement+0.1)%1.0
  }
  if(event.keyCode == 50){                                                      // 2 --> increase diffuse weight by 0.1
    diffuseIncrement = (diffuseIncrement+0.1)%1.0
  }
  if(event.keyCode == 51){                                                      // 3 --> increase specular weight by 0.1
    specularIncrement = (specularIncrement+0.1)%1.0
  }
  
  if(event.keyCode == 78){                                                      // n --> increase specular exponent by 1
    expIncrement = (expIncrement + 1.0)%20.0;
  }
  
}

function handleKeyUp(event){
  currentKeys[event.keyCode] = false;
}

function handleKeysAndRender(){
  requestAnimationFrame(handleKeysAndRender);

  var translateIncrement = 0.01;
  var rotateIncrement = glMatrix.toRadian(1);
  var mCenter = modelCenters[selectedModel];

  if(!currentKeys[16] && currentKeys[87]){             // w --> translate forward
    vec3.add(eye, eye, [0, 0, translateIncrement]);
  }
  if(!currentKeys[16] && currentKeys[65]){             // a --> translate left
    vec3.add(eye, eye, [translateIncrement, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[83]){             // s --> translate backward
    vec3.add(eye, eye, [0, 0, -translateIncrement]);
  }
  if(!currentKeys[16] && currentKeys[68]){             // d --> translate right
    vec3.add(eye, eye, [-translateIncrement, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[81]){             // q --> translate up
    vec3.add(eye, eye, [0, translateIncrement, 0]);
  }
  if(!currentKeys[16] && currentKeys[69]){             // e --> translate down
    vec3.add(eye, eye, [0, -translateIncrement, 0]);
  }

  if(currentKeys[16] && currentKeys[87]){             // W --> rotate left around X axis
    vec3.rotateX(lookAt, lookAt, [0, 0, 0], rotateIncrement);
    vec3.rotateX(up, up, [0, 0, 0], rotateIncrement);
  }
  if(currentKeys[16] && currentKeys[65]){             // A --> rotate left around Y axis
    vec3.rotateY(lookAt, lookAt, [0, 0, 0], rotateIncrement);
  }
  if(currentKeys[16] && currentKeys[83]){             // S --> rotate right around X axis
    vec3.rotateX(lookAt, lookAt, [0, 0, 0], -rotateIncrement);
    vec3.rotateX(up, up, [0, 0, 0], -rotateIncrement);
  }
  if(currentKeys[16] && currentKeys[68]){             // D --> rotate right around Y axis
    vec3.rotateY(lookAt, lookAt, [0, 0, 0], -rotateIncrement);
  }

  if(currentKeys[37] || currentKeys[39]
      || currentKeys[38] || currentKeys[40]){             // Left, Right, Up or Down Key --> scale selected model
    ambientIncrement = 0.0;
    diffuseIncrement = 0.0;
    specularIncrement = 0.0;
    expIncrement = 0.0;

    mat4.identity(transformMatrix);
    mat4.translate(transformMatrix, transformMatrix, mCenter);
    mat4.scale(transformMatrix, transformMatrix, [1.2, 1.2, 1.2]);
    mat4.translate(transformMatrix, transformMatrix, [-mCenter[0], -mCenter[1], -mCenter[2]]);
  }

  if(currentKeys[32]){                                           // Space --> unselect model
    mat4.identity(transformMatrix);
  }

  if(!currentKeys[16] && currentKeys[79]){              // o --> translate selected model forward
    mat4.translate(transformMatrix, transformMatrix, [0, 0, translateIncrement]);
  }
  if(!currentKeys[16] && currentKeys[75]){              // k --> translate selected model left
    mat4.translate(transformMatrix, transformMatrix, [translateIncrement, 0, 0]);
  }  
  if(!currentKeys[16] && currentKeys[76]){              // l --> translate selected model backward
    mat4.translate(transformMatrix, transformMatrix, [0, 0, -translateIncrement]);
  }
  if(!currentKeys[16] && currentKeys[186]){              // ; --> translate selected model right
    mat4.translate(transformMatrix, transformMatrix, [-translateIncrement, 0, 0]);
  }
  if(!currentKeys[16] && currentKeys[73]){              // i --> translate selected model up
    mat4.translate(transformMatrix, transformMatrix, [0, translateIncrement, 0]);
  }
  if(!currentKeys[16] && currentKeys[80]){              // p --> translate selected model down
    mat4.translate(transformMatrix, transformMatrix, [0, -translateIncrement, 0]);
  }

  if(currentKeys[16] && (currentKeys[75] || currentKeys[186] || currentKeys[79] || currentKeys[76]
                                || currentKeys[73] || currentKeys[80])){

    mat4.translate(transformMatrix, transformMatrix, mCenter);
    if(currentKeys[79]){                                   // O --> rotate selected model forward around X
        mat4.rotateX(transformMatrix, transformMatrix, rotateIncrement);
    }
    if(currentKeys[75]){                                   // K --> rotate selected model left around X axis
      mat4.rotateY(transformMatrix, transformMatrix, rotateIncrement);
    }
    if(currentKeys[76]){                                   // L --> rotate selected model backward around X
      mat4.rotateX(transformMatrix, transformMatrix, -rotateIncrement);
    }
    if(currentKeys[186]){                                  // : --> rotate selected model right around Y axis
        mat4.rotateY(transformMatrix, transformMatrix, -rotateIncrement);
    }
    if(currentKeys[73]){                                   // I --> rotate selected model clockwise around Z
      mat4.rotateZ(transformMatrix, transformMatrix, rotateIncrement);
    }
    if(currentKeys[80]){                                   // P --> rotate selected model counter-clockwise around Z
      mat4.rotateZ(transformMatrix, transformMatrix, -rotateIncrement);
    }

    mat4.translate(transformMatrix, transformMatrix, [-mCenter[0], -mCenter[1], -mCenter[2]]);
  }

  var center = vec3.create();
  vec3.add(center, Eye, lookAt);
  mat4.lookAt(viewMatrix, Eye, center, up);
  mat4.perspective(projMatrix, glMatrix.toRadian(90), gl.viewportWidth/gl.viewportHeight, 0.1, 100.0);

  gl.uniformMatrix4fv(projMatrixUniform, gl.FALSE, projMatrix);
  gl.uniformMatrix4fv(viewMatrixUniform, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(transformMatrixUniform, gl.FALSE, transformMatrix);
  gl.uniform1f(selectedModelUniform, selectedModel);
  gl.uniform1i(blinnToggleUniform, blinnToggle);
  gl.uniform1f(ambientIncrementUniform, ambientIncrement);
  gl.uniform1f(diffuseIncrementUniform, diffuseIncrement);
  gl.uniform1f(specularIncrementUniform, specularIncrement);
  gl.uniform1f(expIncrementUniform, expIncrement);

  renderTriangles();
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  //renderTriangles(); // draw the triangles using webGL
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  handleKeysAndRender();
  
} // end main
