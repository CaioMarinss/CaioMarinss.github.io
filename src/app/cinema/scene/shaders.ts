/**
 * GLSL ported verbatim from the approved prototype. Only addition: `uLayers` (0..1, eased on the
 * CPU) brightens the particles while the Almeida project is hovered; at 0 it is a no-op.
 */

export const BG_VERTEX = /* glsl */ `
void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;

/** Topographic contour lines of fbm noise, tinted mint → violet with the progress. */
export const BG_FRAGMENT = /* glsl */ `
uniform float uTime,uP; uniform vec2 uRes,uMouse;
vec2 h(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(dot(h(i),f),dot(h(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h(i+vec2(0,1)),f-vec2(0,1)),dot(h(i+1.),f-1.),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p*=2.02;a*=.5;}return s;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime*.025;
  vec2 q=uv*1.35+uMouse*.04+vec2(0.,uP*.22);
  float f=fbm(q+vec2(t,-t*.6)+fbm(q*.7-t)*.6);
  float bands=f*14.;
  float d=abs(fract(bands)-.5)/fwidth(bands);
  float line=1.-min(d,1.);
  float major=step(.82,fract(floor(bands)*.37+.11));
  vec3 mint=vec3(.36,.95,.78), vio=vec3(.62,.55,1.);
  vec3 lc=mix(mint,vio,smoothstep(0.,4.,uP));
  float glow=smoothstep(.65,0.,length(uv-vec2(.25,0.)));
  vec3 col=vec3(.006,.012,.014)+lc*.018*glow;
  col+=lc*line*(.035+.05*major)*(.35+glow);
  col*=1.-dot(uv,uv)*.35;
  gl_FragColor=vec4(col,1.);
}
`;

/** Morph between the five shapes with a per-particle delay and a burst mid-transition. */
export const PARTICLE_VERTEX = /* glsl */ `
attribute vec3 p0,p1,p2,p3,p4; attribute float rnd;
uniform float uP,uTime,uSize,uPR,uLayers; varying float vA; varying vec3 vC;
vec3 pick(float k){ if(k<.5)return p0; if(k<1.5)return p1; if(k<2.5)return p2; if(k<3.5)return p3; return p4; }
void main(){
  float seg=clamp(uP,0.,3.999); float k=floor(seg);
  float f=clamp((fract(seg)-.25-rnd*.25)/.45,0.,1.); f=f*f*(3.-2.*f);
  vec3 a=pick(k), b=pick(k+1.);
  vec3 p=mix(a,b,f);
  float burst=sin(f*3.14159);
  p+=normalize(a+vec3(.001))*burst*(.35+rnd*.6);
  p+=vec3(sin(uTime*.6+rnd*40.),cos(uTime*.5+rnd*31.),sin(uTime*.4+rnd*17.))*.025;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=uSize*uPR*(.35+rnd*.65)/-mv.z;
  vA=(.35+.65*rnd)*(1.+uLayers*.6);
  vec3 mint=vec3(.36,.95,.78), vio=vec3(.62,.55,1.), wh=vec3(.92,1.,.97);
  vC=mix(mix(mint,vio,smoothstep(1.,4.,uP)),wh,step(.93,rnd));
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
varying float vA; varying vec3 vC;
void main(){ float d=length(gl_PointCoord-.5); if(d>.5)discard; float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vC,a*a*vA*.9); }
`;
