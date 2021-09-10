import { Renderer } from "https://unpkg.com/ogl@0.0.74/src/core/Renderer.js";
import { Program } from "https://unpkg.com/ogl@0.0.74/src/core/Program.js";
import { Texture } from "https://unpkg.com/ogl@0.0.74/src/core/Texture.js";
import { Triangle } from "https://unpkg.com/ogl@0.0.74/src/extras/Triangle.js";
import { Mesh } from "https://unpkg.com/ogl@0.0.74/src/core/Mesh.js";
import { Vec2 } from "https://unpkg.com/ogl@0.0.74/src/math/Vec2.js";
import { Vec3 } from "https://unpkg.com/ogl@0.0.74/src/math/Vec3.js";
import { hexToRGB } from "https://unpkg.com/ogl@0.0.74/src/math/functions/ColorFunc.js";

class Hero extends Rect {
  constructor(element) {
    super(element);
    this.element = element;
  }

  computeRatio() {
    const naturalWidth = 1920;
    const naturalHeight = 1080;

    this.naturalRatio = naturalWidth / naturalHeight;

    const { width, height } = this;
    const ratio = width / height;

    if (width === 0 || !this.naturalRatio) return;

    const w = ratio > this.naturalRatio ? width : height * this.naturalRatio;
    const h = w / this.naturalRatio;
    this.ratio.x = width / w;
    this.ratio.y = height / h;
  }

  init() {
    super.init();

    const renderer = new Renderer({ alpha: true });
    this.renderer = renderer;
    const gl = renderer.gl;
    this.element.appendChild(gl.canvas);
    const geometry = new Triangle(gl);

    this.ratio = new Vec2(1, 1);
    this.texture = new Texture(gl);
    this.image = new Image();
    this.image.crossOrigin = "anonymous";
    this.image.addEventListener("load", () => {
      this.texture.image = this.image;
    });

    this.image.src =
      "https://h5fwhsu236.execute-api.us-east-2.amazonaws.com/ProxyBizarro?URL=" +
      "https://global-uploads.webflow.com/60995478590a43cbebbd2ae9/613b38aae49959bce35a6006_alpha.png";

    const [r, g, b] = hexToRGB("#F4BF59");

    const program = new Program(gl, {
      uniforms: {
        uRatio: {
          value: this.ratio
        },
        uMask: {
          value: this.texture
        },
        uColor: {
          value: new Vec3(r, g, b)
        },
        uTime: {
          value: 0
        }
      },
      vertex: `
      attribute vec2 position;
      attribute vec2 uv;

      uniform vec2 uRatio;

      varying vec2 vUv;
      varying vec2 vUvRatio;

      float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
      }

      void main() {
        vUv = uv;
        vUvRatio = vec2(
          map(uv.x, 0.0, 1.0, 0.5 - uRatio.x / 2.0, 0.5 + uRatio.x / 2.0),
          map(uv.y, 0.0, 1.0, 0.5 - uRatio.y / 2.0, 0.5 + uRatio.y / 2.0)
        );

        gl_Position = vec4(position, 0., 1.);
      }
      `,
      fragment: `
      precision highp float;

      varying vec2 vUv;
      varying vec2 vUvRatio;

      uniform sampler2D uMask;
      uniform vec3 uColor;
      uniform float uTime;

      float wave(float x,float freq, float speed){
        return sin(x*freq+((uTime*(3.1415/2.0))*speed));
      }
      vec2 waves(vec2 pos){
      
      //   vec2 intensity=vec2(2.0,1.0) * vUvRatio *vec2(0.001);
      
        vec2 waves=vec2(
          wave(pos.y,190.0,0.35) * 0.001,
          wave(pos.x,100.0,0.4)  * 0.001
        );
        return pos+waves;
      }

      void main() {

        

        float frequency=100.0;
        float amplitude=0.003;
        float distortion=sin(vUv.x*frequency+((uTime*(3.1415/2.0))*0.35));

        // float distortion=sin(vUv.x*frequency+ (uTime*(3.1415/2.0)) *0.5 )*amplitude;

        vec2 turbulence = waves(vUvRatio);

        float a = texture2D(uMask,turbulence).r;

        vec3 color = mix(uColor + vec3(0.2),uColor, vUv.y);

        gl_FragColor = vec4(color,a);
      }
      `
    });
    this.program = program;

    const mesh = new Mesh(gl, { geometry, program });

    requestAnimationFrame(update);
    function update(t) {
      requestAnimationFrame(update);

      program.uniforms.uTime.value += 1;

      renderer.render({ scene: mesh });
    }
  }

  onResize(e) {
    super.onResize(e);

    this.renderer.setSize(this.width, this.height);

    this.computeRatio();
  }

  setColor(hex) {
    console.log(this.program.uniforms.uColor.value);

    const rgb = hexToRGB(hex);
    rgb.ease = "power4.out";

    gsap.to(this.program.uniforms.uColor.value, 2, rgb);
  }
}

export { Hero };
