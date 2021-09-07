import {
  Renderer,
  Triangle,
  Program,
  Mesh,
  Texture,
  Vec2
} from "https://unpkg.com/ogl@0.0.74/src/index.mjs";

class WebGLCarouselItem {
  constructor(carousel, element) {
    this.element = element;

    this.carousel = carousel;

    this.ratio = new Vec2(1, 1);

    this.texture = new Texture(this.carousel.renderer.gl);
    this.img = new Image();
    this.img.crossOrigin = "anonymous";
    this.onLoad = this.onLoad.bind(this);
    this.img.addEventListener("load", this.onLoad);
    //this.img.src = this.element.querySelector(".webgl-carousel__item__image").getAttribute("src");
    this.img.src = "https://images.unsplash.com/photo-1630951633284-f35d46350ac3?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
  }

  onLoad() {
    this.texture.image = this.img;

    const { naturalWidth, naturalHeight } = this.img;
    this.naturalRatio = naturalWidth / naturalHeight;

    this.onResize();
  }

  onResize() {
    const { width, height, ratio } = this.carousel;

    if (width === 0 || !this.naturalRatio) return;

    const w = ratio > this.naturalRatio ? width : height * this.naturalRatio;
    const h = w / this.naturalRatio;
    this.ratio.x = width / w;
    this.ratio.y = height / h;
  }
}

class WebGLCarousel extends Rect {
  constructor(element) {
    super(element);
    this.element = element;
  }

  init() {
    super.init();

    const renderer = new Renderer();
    this.renderer = renderer;
    const gl = renderer.gl;
    this.element.appendChild(gl.canvas);
    const geometry = new Triangle(gl);

    this.items = [
      ...this.element.querySelectorAll(".webgl-carousel__item")
    ].map((element) => new WebGLCarouselItem(this, element));

    // https://gl-transitions.com/editor/directionalwarp?direction=1,-0.8

    const program = new Program(gl, {
      uniforms: {
        uProgress: {
          value: 0
        },
        uDelayedProgress: {
          value: 0
        },
        uTexture1: {
          value: this.items[0].texture
        },
        uTexture2: {
          value: this.items[1].texture
        },
        uRatio1: {
          value: this.items[0].ratio
        },
        uRatio2: {
          value: this.items[1].ratio
        }
      },
      vertex: `
        attribute vec2 position;
        attribute vec2 uv;

        varying vec2 vUv;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vPosition;

        uniform vec2 uRatio1;
        uniform vec2 uRatio2;

        float map(float value, float min1, float max1, float min2, float max2) {
          return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
          vPosition = position;
          vUv = uv;
          vUv1 = vec2(
            map(uv.x, 0.0, 1.0, 0.5 - uRatio1.x / 2.0, 0.5 + uRatio1.x / 2.0),
            map(uv.y, 0.0, 1.0, 0.5 - uRatio1.y / 2.0, 0.5 + uRatio1.y / 2.0)
          );
          vUv2 = vec2(
            map(uv.x, 0.0, 1.0, 0.5 - uRatio2.x / 2.0, 0.5 + uRatio2.x / 2.0),
            map(uv.y, 0.0, 1.0, 0.5 - uRatio2.y / 2.0, 0.5 + uRatio2.y / 2.0)
          );
          gl_Position = vec4(position, 0., 1.);
        }
        `,
      fragment: `
        precision highp float;

        uniform sampler2D uTexture1;
        uniform sampler2D uTexture2;
        uniform vec2 uRatio1;
        uniform vec2 uRatio2;
        uniform float uProgress;
        uniform float uDelayedProgress;

        varying vec2 vUv;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vPosition;

        const float smoothness = 0.5;
        const vec2 center = vec2(0.5, 0.5);
        const vec2 direction = vec2(1.0, -0.8);

        float circle(in vec2 _st, in float _radius){
          vec2 dist = _st-vec2(0.5);
          return 1.-smoothstep(_radius-(_radius*0.01),
                                _radius+(_radius*0.01),
                                dot(dist,dist)*4.0);
        } 

        void main() {
          vec2 uv = vUv;
          uv.y += 0.15 * uProgress;

          float dist = 1. - distance(vUv, vec2(.5, .5));
          vec4 textureOne = texture2D(uTexture1, vUv1 * (1. - (dist * uProgress)));
          vec4 textureTwo = texture2D(uTexture2, vUv2 * (1. - (dist * (1. - uProgress))));

          float PI = 3.1415;
          float etalement = 3. + (uProgress * 5.);
          float centerSin = etalement / 2.;
          float st = ((vUv.y - 1. + centerSin) / etalement);

          float d = sin(st * PI);
          float t = step(vUv.x + (1.-((uProgress - 0.1) * 1.2)), d );

          vec4 color = mix(textureTwo, textureOne, 1. - t);

          gl_FragColor = color;
        }
        `
    });
    this.program = program;

    const mesh = new Mesh(gl, { geometry, program });

    requestAnimationFrame(update);
    function update(t) {
      requestAnimationFrame(update);

      // program.uniforms.uProgress.value = Math.sin(t * 0.001) / 2 + 0.5;

      renderer.render({ scene: mesh });
    }

    // this.initNav();
  }

  // initNav() {
  //   this.prevButton = this.element.querySelector(".webgl-carousel__nav--prev");
  //   this.nextButton = this.element.querySelector(".webgl-carousel__nav--next");

  //   this.onPrev = this.onPrev.bind(this);
  //   this.prevButton.addEventListener("click", this.onPrev);

  //   this.onNext = this.onNext.bind(this);
  //   this.nextButton.addEventListener("click", this.onNext);
  // }

  onPrev() {
    gsap.to(this.program.uniforms.uProgress, {
      value: 0,
      duration: 1.5,
      ease: "expo.out"
    });
    gsap.to(this.program.uniforms.uDelayedProgress, {
      value: 0,
      duration: 1.5,
      ease: "expo.in"
    });
  }

  onNext() {
    gsap.to(this.program.uniforms.uProgress, {
      value: 1,
      duration: 1.5,
      ease: "expo.out"
    });
    gsap.to(this.program.uniforms.uDelayedProgress, {
      value: 1,
      duration: 1.5,
      ease: "expo.in"
    });
  }

  onResize(e) {
    super.onResize(e);
    this.ratio = this.width / this.height;

    this.items.forEach((item) => item.onResize());

    this.renderer.setSize(this.width, this.height);
  }
}

export { WebGLCarousel }
