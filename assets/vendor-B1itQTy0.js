import{R as te,r as f}from"./react-vendor-D1jwkorh.js";const st=e=>Symbol.iterator in e,ct=e=>"entries"in e,lt=(e,t)=>{const n=e instanceof Map?e:new Map(e.entries()),r=t instanceof Map?t:new Map(t.entries());if(n.size!==r.size)return!1;for(const[o,a]of n)if(!r.has(o)||!Object.is(a,r.get(o)))return!1;return!0},cn=(e,t)=>{const n=e[Symbol.iterator](),r=t[Symbol.iterator]();let o=n.next(),a=r.next();for(;!o.done&&!a.done;){if(!Object.is(o.value,a.value))return!1;o=n.next(),a=r.next()}return!!o.done&&!!a.done};function ln(e,t){return Object.is(e,t)?!0:typeof e!="object"||e===null||typeof t!="object"||t===null||Object.getPrototypeOf(e)!==Object.getPrototypeOf(t)?!1:st(e)&&st(t)?ct(e)&&ct(t)?lt(e,t):cn(e,t):lt({entries:()=>Object.entries(e)},{entries:()=>Object.entries(t)})}function Ci(e){const t=te.useRef(void 0);return n=>{const r=e(n);return ln(t.current,r)?t.current:t.current=r}}/**
 * react-router v7.10.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var ut="popstate";function xi(e={}){function t(r,o){let{pathname:a,search:i,hash:s}=r.location;return Te("",{pathname:a,search:i,hash:s},o.state&&o.state.usr||null,o.state&&o.state.key||"default")}function n(r,o){return typeof o=="string"?o:re(o)}return hn(t,n,null,e)}function N(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function R(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function un(){return Math.random().toString(36).substring(2,10)}function ht(e,t){return{usr:e.state,key:e.key,idx:t}}function Te(e,t,n=null,r){return{pathname:typeof e=="string"?e:e.pathname,search:"",hash:"",...typeof t=="string"?Z(t):t,state:n,key:t&&t.key||r||un()}}function re({pathname:e="/",search:t="",hash:n=""}){return t&&t!=="?"&&(e+=t.charAt(0)==="?"?t:"?"+t),n&&n!=="#"&&(e+=n.charAt(0)==="#"?n:"#"+n),e}function Z(e){let t={};if(e){let n=e.indexOf("#");n>=0&&(t.hash=e.substring(n),e=e.substring(0,n));let r=e.indexOf("?");r>=0&&(t.search=e.substring(r),e=e.substring(0,r)),e&&(t.pathname=e)}return t}function hn(e,t,n,r={}){let{window:o=document.defaultView,v5Compat:a=!1}=r,i=o.history,s="POP",c=null,l=u();l==null&&(l=0,i.replaceState({...i.state,idx:l},""));function u(){return(i.state||{idx:null}).idx}function d(){s="POP";let v=u(),g=v==null?null:v-l;l=v,c&&c({action:s,location:w.location,delta:g})}function p(v,g){s="PUSH";let M=Te(w.location,v,g);l=u()+1;let m=ht(M,l),b=w.createHref(M);try{i.pushState(m,"",b)}catch(C){if(C instanceof DOMException&&C.name==="DataCloneError")throw C;o.location.assign(b)}a&&c&&c({action:s,location:w.location,delta:1})}function y(v,g){s="REPLACE";let M=Te(w.location,v,g);l=u();let m=ht(M,l),b=w.createHref(M);i.replaceState(m,"",b),a&&c&&c({action:s,location:w.location,delta:0})}function k(v){return dn(v)}let w={get action(){return s},get location(){return e(o,i)},listen(v){if(c)throw new Error("A history only accepts one active listener");return o.addEventListener(ut,d),c=v,()=>{o.removeEventListener(ut,d),c=null}},createHref(v){return t(o,v)},createURL:k,encodeLocation(v){let g=k(v);return{pathname:g.pathname,search:g.search,hash:g.hash}},push:p,replace:y,go(v){return i.go(v)}};return w}function dn(e,t=!1){let n="http://localhost";typeof window<"u"&&(n=window.location.origin!=="null"?window.location.origin:window.location.href),N(n,"No window.location.(origin|href) available to create URL");let r=typeof e=="string"?e:re(e);return r=r.replace(/ $/,"%20"),!t&&r.startsWith("//")&&(r=n+r),new URL(r,n)}function Nt(e,t,n="/"){return fn(e,t,n,!1)}function fn(e,t,n,r){let o=typeof t=="string"?Z(t):t,a=D(o.pathname||"/",n);if(a==null)return null;let i=St(e);pn(i);let s=null;for(let c=0;s==null&&c<i.length;++c){let l=xn(a);s=_n(i[c],l,r)}return s}function St(e,t=[],n=[],r="",o=!1){let a=(i,s,c=o,l)=>{let u={relativePath:l===void 0?i.path||"":l,caseSensitive:i.caseSensitive===!0,childrenIndex:s,route:i};if(u.relativePath.startsWith("/")){if(!u.relativePath.startsWith(r)&&c)return;N(u.relativePath.startsWith(r),`Absolute route path "${u.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),u.relativePath=u.relativePath.slice(r.length)}let d=j([r,u.relativePath]),p=n.concat(u);i.children&&i.children.length>0&&(N(i.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${d}".`),St(i.children,t,p,d,c)),!(i.path==null&&!i.index)&&t.push({path:d,score:Mn(d,i.index),routesMeta:p})};return e.forEach((i,s)=>{var c;if(i.path===""||!((c=i.path)!=null&&c.includes("?")))a(i,s);else for(let l of Lt(i.path))a(i,s,!0,l)}),t}function Lt(e){let t=e.split("/");if(t.length===0)return[];let[n,...r]=t,o=n.endsWith("?"),a=n.replace(/\?$/,"");if(r.length===0)return o?[a,""]:[a];let i=Lt(r.join("/")),s=[];return s.push(...i.map(c=>c===""?a:[a,c].join("/"))),o&&s.push(...i),s.map(c=>e.startsWith("/")&&c===""?"/":c)}function pn(e){e.sort((t,n)=>t.score!==n.score?n.score-t.score:bn(t.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}var yn=/^:[\w-]+$/,mn=3,gn=2,kn=1,wn=10,vn=-2,dt=e=>e==="*";function Mn(e,t){let n=e.split("/"),r=n.length;return n.some(dt)&&(r+=vn),t&&(r+=gn),n.filter(o=>!dt(o)).reduce((o,a)=>o+(yn.test(a)?mn:a===""?kn:wn),r)}function bn(e,t){return e.length===t.length&&e.slice(0,-1).every((r,o)=>r===t[o])?e[e.length-1]-t[t.length-1]:0}function _n(e,t,n=!1){let{routesMeta:r}=e,o={},a="/",i=[];for(let s=0;s<r.length;++s){let c=r[s],l=s===r.length-1,u=a==="/"?t:t.slice(a.length)||"/",d=fe({path:c.relativePath,caseSensitive:c.caseSensitive,end:l},u),p=c.route;if(!d&&l&&n&&!r[r.length-1].route.index&&(d=fe({path:c.relativePath,caseSensitive:c.caseSensitive,end:!1},u)),!d)return null;Object.assign(o,d.params),i.push({params:o,pathname:j([a,d.pathname]),pathnameBase:Pn(j([a,d.pathnameBase])),route:p}),d.pathnameBase!=="/"&&(a=j([a,d.pathnameBase]))}return i}function fe(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[n,r]=Cn(e.path,e.caseSensitive,e.end),o=t.match(n);if(!o)return null;let a=o[0],i=a.replace(/(.)\/+$/,"$1"),s=o.slice(1);return{params:r.reduce((l,{paramName:u,isOptional:d},p)=>{if(u==="*"){let k=s[p]||"";i=a.slice(0,a.length-k.length).replace(/(.)\/+$/,"$1")}const y=s[p];return d&&!y?l[u]=void 0:l[u]=(y||"").replace(/%2F/g,"/"),l},{}),pathname:a,pathnameBase:i,pattern:e}}function Cn(e,t=!1,n=!0){R(e==="*"||!e.endsWith("*")||e.endsWith("/*"),`Route path "${e}" will be treated as if it were "${e.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/,"/*")}".`);let r=[],o="^"+e.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(i,s,c)=>(r.push({paramName:s,isOptional:c!=null}),c?"/?([^\\/]+)?":"/([^\\/]+)")).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return e.endsWith("*")?(r.push({paramName:"*"}),o+=e==="*"||e==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?o+="\\/*$":e!==""&&e!=="/"&&(o+="(?:(?=\\/|$))"),[new RegExp(o,t?void 0:"i"),r]}function xn(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\//g,"%2F")).join("/")}catch(t){return R(!1,`The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`),e}}function D(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith("/")?t.length-1:t.length,r=e.charAt(n);return r&&r!=="/"?null:e.slice(n)||"/"}var En=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,Nn=e=>En.test(e);function Sn(e,t="/"){let{pathname:n,search:r="",hash:o=""}=typeof e=="string"?Z(e):e,a;if(n)if(Nn(n))a=n;else{if(n.includes("//")){let i=n;n=n.replace(/\/\/+/g,"/"),R(!1,`Pathnames cannot have embedded double slashes - normalizing ${i} -> ${n}`)}n.startsWith("/")?a=ft(n.substring(1),"/"):a=ft(n,t)}else a=t;return{pathname:a,search:Rn(r),hash:An(o)}}function ft(e,t){let n=t.replace(/\/+$/,"").split("/");return e.split("/").forEach(o=>{o===".."?n.length>1&&n.pop():o!=="."&&n.push(o)}),n.length>1?n.join("/"):"/"}function _e(e,t,n,r){return`Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${n}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function Ln(e){return e.filter((t,n)=>n===0||t.route.path&&t.route.path.length>0)}function Ke(e){let t=Ln(e);return t.map((n,r)=>r===t.length-1?n.pathname:n.pathnameBase)}function Je(e,t,n,r=!1){let o;typeof e=="string"?o=Z(e):(o={...e},N(!o.pathname||!o.pathname.includes("?"),_e("?","pathname","search",o)),N(!o.pathname||!o.pathname.includes("#"),_e("#","pathname","hash",o)),N(!o.search||!o.search.includes("#"),_e("#","search","hash",o)));let a=e===""||o.pathname==="",i=a?"/":o.pathname,s;if(i==null)s=n;else{let d=t.length-1;if(!r&&i.startsWith("..")){let p=i.split("/");for(;p[0]==="..";)p.shift(),d-=1;o.pathname=p.join("/")}s=d>=0?t[d]:"/"}let c=Sn(o,s),l=i&&i!=="/"&&i.endsWith("/"),u=(a||i===".")&&n.endsWith("/");return!c.pathname.endsWith("/")&&(l||u)&&(c.pathname+="/"),c}var j=e=>e.join("/").replace(/\/\/+/g,"/"),Pn=e=>e.replace(/\/+$/,"").replace(/^\/*/,"/"),Rn=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,An=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e;function $n(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}function Bn(e){return e.map(t=>t.route.path).filter(Boolean).join("/").replace(/\/\/*/g,"/")||"/"}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var Pt=["POST","PUT","PATCH","DELETE"];new Set(Pt);var In=["GET",...Pt];new Set(In);var Q=f.createContext(null);Q.displayName="DataRouter";var me=f.createContext(null);me.displayName="DataRouterState";f.createContext(!1);var Rt=f.createContext({isTransitioning:!1});Rt.displayName="ViewTransition";var Tn=f.createContext(new Map);Tn.displayName="Fetchers";var zn=f.createContext(null);zn.displayName="Await";var $=f.createContext(null);$.displayName="Navigation";var ae=f.createContext(null);ae.displayName="Location";var B=f.createContext({outlet:null,matches:[],isDataRoute:!1});B.displayName="Route";var Ye=f.createContext(null);Ye.displayName="RouteError";function jn(e,{relative:t}={}){N(X(),"useHref() may be used only in the context of a <Router> component.");let{basename:n,navigator:r}=f.useContext($),{hash:o,pathname:a,search:i}=ie(e,{relative:t}),s=a;return n!=="/"&&(s=a==="/"?n:j([n,a])),r.createHref({pathname:s,search:i,hash:o})}function X(){return f.useContext(ae)!=null}function H(){return N(X(),"useLocation() may be used only in the context of a <Router> component."),f.useContext(ae).location}var At="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function $t(e){f.useContext($).static||f.useLayoutEffect(e)}function Ge(){let{isDataRoute:e}=f.useContext(B);return e?Zn():Dn()}function Dn(){N(X(),"useNavigate() may be used only in the context of a <Router> component.");let e=f.useContext(Q),{basename:t,navigator:n}=f.useContext($),{matches:r}=f.useContext(B),{pathname:o}=H(),a=JSON.stringify(Ke(r)),i=f.useRef(!1);return $t(()=>{i.current=!0}),f.useCallback((c,l={})=>{if(R(i.current,At),!i.current)return;if(typeof c=="number"){n.go(c);return}let u=Je(c,JSON.parse(a),o,l.relative==="path");e==null&&t!=="/"&&(u.pathname=u.pathname==="/"?t:j([t,u.pathname])),(l.replace?n.replace:n.push)(u,l.state,l)},[t,n,a,o,e])}f.createContext(null);function Ei(){let{matches:e}=f.useContext(B),t=e[e.length-1];return t?t.params:{}}function ie(e,{relative:t}={}){let{matches:n}=f.useContext(B),{pathname:r}=H(),o=JSON.stringify(Ke(n));return f.useMemo(()=>Je(e,JSON.parse(o),r,t==="path"),[e,o,r,t])}function Hn(e,t){return Bt(e,t)}function Bt(e,t,n,r,o){var M;N(X(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:a}=f.useContext($),{matches:i}=f.useContext(B),s=i[i.length-1],c=s?s.params:{},l=s?s.pathname:"/",u=s?s.pathnameBase:"/",d=s&&s.route;{let m=d&&d.path||"";It(l,!d||m.endsWith("*")||m.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${l}" (under <Route path="${m}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${m}"> to <Route path="${m==="/"?"*":`${m}/*`}">.`)}let p=H(),y;if(t){let m=typeof t=="string"?Z(t):t;N(u==="/"||((M=m.pathname)==null?void 0:M.startsWith(u)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${u}" but pathname "${m.pathname}" was given in the \`location\` prop.`),y=m}else y=p;let k=y.pathname||"/",w=k;if(u!=="/"){let m=u.replace(/^\//,"").split("/");w="/"+k.replace(/^\//,"").split("/").slice(m.length).join("/")}let v=Nt(e,{pathname:w});R(d||v!=null,`No routes matched location "${y.pathname}${y.search}${y.hash}" `),R(v==null||v[v.length-1].route.element!==void 0||v[v.length-1].route.Component!==void 0||v[v.length-1].route.lazy!==void 0,`Matched leaf route at location "${y.pathname}${y.search}${y.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let g=qn(v&&v.map(m=>Object.assign({},m,{params:Object.assign({},c,m.params),pathname:j([u,a.encodeLocation?a.encodeLocation(m.pathname.replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:m.pathname]),pathnameBase:m.pathnameBase==="/"?u:j([u,a.encodeLocation?a.encodeLocation(m.pathnameBase.replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:m.pathnameBase])})),i,n,r,o);return t&&g?f.createElement(ae.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",...y},navigationType:"POP"}},g):g}function Vn(){let e=Gn(),t=$n(e)?`${e.status} ${e.statusText}`:e instanceof Error?e.message:JSON.stringify(e),n=e instanceof Error?e.stack:null,r="rgba(200,200,200, 0.5)",o={padding:"0.5rem",backgroundColor:r},a={padding:"2px 4px",backgroundColor:r},i=null;return console.error("Error handled by React Router default ErrorBoundary:",e),i=f.createElement(f.Fragment,null,f.createElement("p",null,"💿 Hey developer 👋"),f.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",f.createElement("code",{style:a},"ErrorBoundary")," or"," ",f.createElement("code",{style:a},"errorElement")," prop on your route.")),f.createElement(f.Fragment,null,f.createElement("h2",null,"Unexpected Application Error!"),f.createElement("h3",{style:{fontStyle:"italic"}},t),n?f.createElement("pre",{style:o},n):null,i)}var Fn=f.createElement(Vn,null),Un=class extends f.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,t){return t.location!==e.location||t.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:t.error,location:t.location,revalidation:e.revalidation||t.revalidation}}componentDidCatch(e,t){this.props.onError?this.props.onError(e,t):console.error("React Router caught the following error during render",e)}render(){return this.state.error!==void 0?f.createElement(B.Provider,{value:this.props.routeContext},f.createElement(Ye.Provider,{value:this.state.error,children:this.props.component})):this.props.children}};function On({routeContext:e,match:t,children:n}){let r=f.useContext(Q);return r&&r.static&&r.staticContext&&(t.route.errorElement||t.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=t.route.id),f.createElement(B.Provider,{value:e},n)}function qn(e,t=[],n=null,r=null,o=null){if(e==null){if(!n)return null;if(n.errors)e=n.matches;else if(t.length===0&&!n.initialized&&n.matches.length>0)e=n.matches;else return null}let a=e,i=n==null?void 0:n.errors;if(i!=null){let u=a.findIndex(d=>d.route.id&&(i==null?void 0:i[d.route.id])!==void 0);N(u>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(i).join(",")}`),a=a.slice(0,Math.min(a.length,u+1))}let s=!1,c=-1;if(n)for(let u=0;u<a.length;u++){let d=a[u];if((d.route.HydrateFallback||d.route.hydrateFallbackElement)&&(c=u),d.route.id){let{loaderData:p,errors:y}=n,k=d.route.loader&&!p.hasOwnProperty(d.route.id)&&(!y||y[d.route.id]===void 0);if(d.route.lazy||k){s=!0,c>=0?a=a.slice(0,c+1):a=[a[0]];break}}}let l=n&&r?(u,d)=>{var p,y;r(u,{location:n.location,params:((y=(p=n.matches)==null?void 0:p[0])==null?void 0:y.params)??{},unstable_pattern:Bn(n.matches),errorInfo:d})}:void 0;return a.reduceRight((u,d,p)=>{let y,k=!1,w=null,v=null;n&&(y=i&&d.route.id?i[d.route.id]:void 0,w=d.route.errorElement||Fn,s&&(c<0&&p===0?(It("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),k=!0,v=null):c===p&&(k=!0,v=d.route.hydrateFallbackElement||null)));let g=t.concat(a.slice(0,p+1)),M=()=>{let m;return y?m=w:k?m=v:d.route.Component?m=f.createElement(d.route.Component,null):d.route.element?m=d.route.element:m=u,f.createElement(On,{match:d,routeContext:{outlet:u,matches:g,isDataRoute:n!=null},children:m})};return n&&(d.route.ErrorBoundary||d.route.errorElement||p===0)?f.createElement(Un,{location:n.location,revalidation:n.revalidation,component:w,error:y,children:M(),routeContext:{outlet:null,matches:g,isDataRoute:!0},onError:l}):M()},null)}function Ze(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Wn(e){let t=f.useContext(Q);return N(t,Ze(e)),t}function Kn(e){let t=f.useContext(me);return N(t,Ze(e)),t}function Jn(e){let t=f.useContext(B);return N(t,Ze(e)),t}function Qe(e){let t=Jn(e),n=t.matches[t.matches.length-1];return N(n.route.id,`${e} can only be used on routes that contain a unique "id"`),n.route.id}function Yn(){return Qe("useRouteId")}function Gn(){var r;let e=f.useContext(Ye),t=Kn("useRouteError"),n=Qe("useRouteError");return e!==void 0?e:(r=t.errors)==null?void 0:r[n]}function Zn(){let{router:e}=Wn("useNavigate"),t=Qe("useNavigate"),n=f.useRef(!1);return $t(()=>{n.current=!0}),f.useCallback(async(o,a={})=>{R(n.current,At),n.current&&(typeof o=="number"?await e.navigate(o):await e.navigate(o,{fromRouteId:t,...a}))},[e,t])}var pt={};function It(e,t,n){!t&&!pt[e]&&(pt[e]=!0,R(!1,n))}f.memo(Qn);function Qn({routes:e,future:t,state:n,unstable_onError:r}){return Bt(e,void 0,n,r,t)}function Ni({to:e,replace:t,state:n,relative:r}){N(X(),"<Navigate> may be used only in the context of a <Router> component.");let{static:o}=f.useContext($);R(!o,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:a}=f.useContext(B),{pathname:i}=H(),s=Ge(),c=Je(e,Ke(a),i,r==="path"),l=JSON.stringify(c);return f.useEffect(()=>{s(JSON.parse(l),{replace:t,state:n,relative:r})},[s,l,r,t,n]),null}function Xn(e){N(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function Si({basename:e="/",children:t=null,location:n,navigationType:r="POP",navigator:o,static:a=!1,unstable_useTransitions:i}){N(!X(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let s=e.replace(/^\/*/,"/"),c=f.useMemo(()=>({basename:s,navigator:o,static:a,unstable_useTransitions:i,future:{}}),[s,o,a,i]);typeof n=="string"&&(n=Z(n));let{pathname:l="/",search:u="",hash:d="",state:p=null,key:y="default"}=n,k=f.useMemo(()=>{let w=D(l,s);return w==null?null:{location:{pathname:w,search:u,hash:d,state:p,key:y},navigationType:r}},[s,l,u,d,p,y,r]);return R(k!=null,`<Router basename="${s}"> is not able to match the URL "${l}${u}${d}" because it does not start with the basename, so the <Router> won't render anything.`),k==null?null:f.createElement($.Provider,{value:c},f.createElement(ae.Provider,{children:t,value:k}))}function Li({children:e,location:t}){return Hn(ze(e),t)}function ze(e,t=[]){let n=[];return f.Children.forEach(e,(r,o)=>{if(!f.isValidElement(r))return;let a=[...t,o];if(r.type===f.Fragment){n.push.apply(n,ze(r.props.children,a));return}N(r.type===Xn,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),N(!r.props.index||!r.props.children,"An index route cannot have child routes.");let i={id:r.props.id||a.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(i.children=ze(r.props.children,a)),n.push(i)}),n}var he="get",de="application/x-www-form-urlencoded";function ge(e){return typeof HTMLElement<"u"&&e instanceof HTMLElement}function er(e){return ge(e)&&e.tagName.toLowerCase()==="button"}function tr(e){return ge(e)&&e.tagName.toLowerCase()==="form"}function nr(e){return ge(e)&&e.tagName.toLowerCase()==="input"}function rr(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function or(e,t){return e.button===0&&(!t||t==="_self")&&!rr(e)}function je(e=""){return new URLSearchParams(typeof e=="string"||Array.isArray(e)||e instanceof URLSearchParams?e:Object.keys(e).reduce((t,n)=>{let r=e[n];return t.concat(Array.isArray(r)?r.map(o=>[n,o]):[[n,r]])},[]))}function ar(e,t){let n=je(e);return t&&t.forEach((r,o)=>{n.has(o)||t.getAll(o).forEach(a=>{n.append(o,a)})}),n}var ce=null;function ir(){if(ce===null)try{new FormData(document.createElement("form"),0),ce=!1}catch{ce=!0}return ce}var sr=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function Ce(e){return e!=null&&!sr.has(e)?(R(!1,`"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${de}"`),null):e}function cr(e,t){let n,r,o,a,i;if(tr(e)){let s=e.getAttribute("action");r=s?D(s,t):null,n=e.getAttribute("method")||he,o=Ce(e.getAttribute("enctype"))||de,a=new FormData(e)}else if(er(e)||nr(e)&&(e.type==="submit"||e.type==="image")){let s=e.form;if(s==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let c=e.getAttribute("formaction")||s.getAttribute("action");if(r=c?D(c,t):null,n=e.getAttribute("formmethod")||s.getAttribute("method")||he,o=Ce(e.getAttribute("formenctype"))||Ce(s.getAttribute("enctype"))||de,a=new FormData(s,e),!ir()){let{name:l,type:u,value:d}=e;if(u==="image"){let p=l?`${l}.`:"";a.append(`${p}x`,"0"),a.append(`${p}y`,"0")}else l&&a.append(l,d)}}else{if(ge(e))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');n=he,r=null,o=de,i=e}return a&&o==="text/plain"&&(i=a,a=void 0),{action:r,method:n.toLowerCase(),encType:o,formData:a,body:i}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function Xe(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function lr(e,t,n){let r=typeof e=="string"?new URL(e,typeof window>"u"?"server://singlefetch/":window.location.origin):e;return r.pathname==="/"?r.pathname=`_root.${n}`:t&&D(r.pathname,t)==="/"?r.pathname=`${t.replace(/\/$/,"")}/_root.${n}`:r.pathname=`${r.pathname.replace(/\/$/,"")}.${n}`,r}async function ur(e,t){if(e.id in t)return t[e.id];try{let n=await import(e.module);return t[e.id]=n,n}catch(n){return console.error(`Error loading route module \`${e.module}\`, reloading page...`),console.error(n),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function hr(e){return e==null?!1:e.href==null?e.rel==="preload"&&typeof e.imageSrcSet=="string"&&typeof e.imageSizes=="string":typeof e.rel=="string"&&typeof e.href=="string"}async function dr(e,t,n){let r=await Promise.all(e.map(async o=>{let a=t.routes[o.route.id];if(a){let i=await ur(a,n);return i.links?i.links():[]}return[]}));return mr(r.flat(1).filter(hr).filter(o=>o.rel==="stylesheet"||o.rel==="preload").map(o=>o.rel==="stylesheet"?{...o,rel:"prefetch",as:"style"}:{...o,rel:"prefetch"}))}function yt(e,t,n,r,o,a){let i=(c,l)=>n[l]?c.route.id!==n[l].route.id:!0,s=(c,l)=>{var u;return n[l].pathname!==c.pathname||((u=n[l].route.path)==null?void 0:u.endsWith("*"))&&n[l].params["*"]!==c.params["*"]};return a==="assets"?t.filter((c,l)=>i(c,l)||s(c,l)):a==="data"?t.filter((c,l)=>{var d;let u=r.routes[c.route.id];if(!u||!u.hasLoader)return!1;if(i(c,l)||s(c,l))return!0;if(c.route.shouldRevalidate){let p=c.route.shouldRevalidate({currentUrl:new URL(o.pathname+o.search+o.hash,window.origin),currentParams:((d=n[0])==null?void 0:d.params)||{},nextUrl:new URL(e,window.origin),nextParams:c.params,defaultShouldRevalidate:!0});if(typeof p=="boolean")return p}return!0}):[]}function fr(e,t,{includeHydrateFallback:n}={}){return pr(e.map(r=>{let o=t.routes[r.route.id];if(!o)return[];let a=[o.module];return o.clientActionModule&&(a=a.concat(o.clientActionModule)),o.clientLoaderModule&&(a=a.concat(o.clientLoaderModule)),n&&o.hydrateFallbackModule&&(a=a.concat(o.hydrateFallbackModule)),o.imports&&(a=a.concat(o.imports)),a}).flat(1))}function pr(e){return[...new Set(e)]}function yr(e){let t={},n=Object.keys(e).sort();for(let r of n)t[r]=e[r];return t}function mr(e,t){let n=new Set;return new Set(t),e.reduce((r,o)=>{let a=JSON.stringify(yr(o));return n.has(a)||(n.add(a),r.push({key:a,link:o})),r},[])}function Tt(){let e=f.useContext(Q);return Xe(e,"You must render this element inside a <DataRouterContext.Provider> element"),e}function gr(){let e=f.useContext(me);return Xe(e,"You must render this element inside a <DataRouterStateContext.Provider> element"),e}var et=f.createContext(void 0);et.displayName="FrameworkContext";function zt(){let e=f.useContext(et);return Xe(e,"You must render this element inside a <HydratedRouter> element"),e}function kr(e,t){let n=f.useContext(et),[r,o]=f.useState(!1),[a,i]=f.useState(!1),{onFocus:s,onBlur:c,onMouseEnter:l,onMouseLeave:u,onTouchStart:d}=t,p=f.useRef(null);f.useEffect(()=>{if(e==="render"&&i(!0),e==="viewport"){let w=g=>{g.forEach(M=>{i(M.isIntersecting)})},v=new IntersectionObserver(w,{threshold:.5});return p.current&&v.observe(p.current),()=>{v.disconnect()}}},[e]),f.useEffect(()=>{if(r){let w=setTimeout(()=>{i(!0)},100);return()=>{clearTimeout(w)}}},[r]);let y=()=>{o(!0)},k=()=>{o(!1),i(!1)};return n?e!=="intent"?[a,p,{}]:[a,p,{onFocus:ee(s,y),onBlur:ee(c,k),onMouseEnter:ee(l,y),onMouseLeave:ee(u,k),onTouchStart:ee(d,y)}]:[!1,p,{}]}function ee(e,t){return n=>{e&&e(n),n.defaultPrevented||t(n)}}function wr({page:e,...t}){let{router:n}=Tt(),r=f.useMemo(()=>Nt(n.routes,e,n.basename),[n.routes,e,n.basename]);return r?f.createElement(Mr,{page:e,matches:r,...t}):null}function vr(e){let{manifest:t,routeModules:n}=zt(),[r,o]=f.useState([]);return f.useEffect(()=>{let a=!1;return dr(e,t,n).then(i=>{a||o(i)}),()=>{a=!0}},[e,t,n]),r}function Mr({page:e,matches:t,...n}){let r=H(),{manifest:o,routeModules:a}=zt(),{basename:i}=Tt(),{loaderData:s,matches:c}=gr(),l=f.useMemo(()=>yt(e,t,c,o,r,"data"),[e,t,c,o,r]),u=f.useMemo(()=>yt(e,t,c,o,r,"assets"),[e,t,c,o,r]),d=f.useMemo(()=>{if(e===r.pathname+r.search+r.hash)return[];let k=new Set,w=!1;if(t.forEach(g=>{var m;let M=o.routes[g.route.id];!M||!M.hasLoader||(!l.some(b=>b.route.id===g.route.id)&&g.route.id in s&&((m=a[g.route.id])!=null&&m.shouldRevalidate)||M.hasClientLoader?w=!0:k.add(g.route.id))}),k.size===0)return[];let v=lr(e,i,"data");return w&&k.size>0&&v.searchParams.set("_routes",t.filter(g=>k.has(g.route.id)).map(g=>g.route.id).join(",")),[v.pathname+v.search]},[i,s,r,o,l,t,e,a]),p=f.useMemo(()=>fr(u,o),[u,o]),y=vr(u);return f.createElement(f.Fragment,null,d.map(k=>f.createElement("link",{key:k,rel:"prefetch",as:"fetch",href:k,...n})),p.map(k=>f.createElement("link",{key:k,rel:"modulepreload",href:k,...n})),y.map(({key:k,link:w})=>f.createElement("link",{key:k,nonce:n.nonce,...w})))}function br(...e){return t=>{e.forEach(n=>{typeof n=="function"?n(t):n!=null&&(n.current=t)})}}var jt=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{jt&&(window.__reactRouterVersion="7.10.1")}catch{}var Dt=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,Ht=f.forwardRef(function({onClick:t,discover:n="render",prefetch:r="none",relative:o,reloadDocument:a,replace:i,state:s,target:c,to:l,preventScrollReset:u,viewTransition:d,...p},y){let{basename:k,unstable_useTransitions:w}=f.useContext($),v=typeof l=="string"&&Dt.test(l),g,M=!1;if(typeof l=="string"&&v&&(g=l,jt))try{let S=new URL(window.location.href),I=l.startsWith("//")?new URL(S.protocol+l):new URL(l),q=D(I.pathname,k);I.origin===S.origin&&q!=null?l=q+I.search+I.hash:M=!0}catch{R(!1,`<Link to="${l}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}let m=jn(l,{relative:o}),[b,C,x]=kr(r,p),E=Er(l,{replace:i,state:s,target:c,preventScrollReset:u,relative:o,viewTransition:d,unstable_useTransitions:w});function L(S){t&&t(S),S.defaultPrevented||E(S)}let P=f.createElement("a",{...p,...x,href:g||m,onClick:M||a?t:L,ref:br(y,C),target:c,"data-discover":!v&&n==="render"?"true":void 0});return b&&!v?f.createElement(f.Fragment,null,P,f.createElement(wr,{page:m})):P});Ht.displayName="Link";var _r=f.forwardRef(function({"aria-current":t="page",caseSensitive:n=!1,className:r="",end:o=!1,style:a,to:i,viewTransition:s,children:c,...l},u){let d=ie(i,{relative:l.relative}),p=H(),y=f.useContext(me),{navigator:k,basename:w}=f.useContext($),v=y!=null&&Rr(d)&&s===!0,g=k.encodeLocation?k.encodeLocation(d).pathname:d.pathname,M=p.pathname,m=y&&y.navigation&&y.navigation.location?y.navigation.location.pathname:null;n||(M=M.toLowerCase(),m=m?m.toLowerCase():null,g=g.toLowerCase()),m&&w&&(m=D(m,w)||m);const b=g!=="/"&&g.endsWith("/")?g.length-1:g.length;let C=M===g||!o&&M.startsWith(g)&&M.charAt(b)==="/",x=m!=null&&(m===g||!o&&m.startsWith(g)&&m.charAt(g.length)==="/"),E={isActive:C,isPending:x,isTransitioning:v},L=C?t:void 0,P;typeof r=="function"?P=r(E):P=[r,C?"active":null,x?"pending":null,v?"transitioning":null].filter(Boolean).join(" ");let S=typeof a=="function"?a(E):a;return f.createElement(Ht,{...l,"aria-current":L,className:P,ref:u,style:S,to:i,viewTransition:s},typeof c=="function"?c(E):c)});_r.displayName="NavLink";var Cr=f.forwardRef(({discover:e="render",fetcherKey:t,navigate:n,reloadDocument:r,replace:o,state:a,method:i=he,action:s,onSubmit:c,relative:l,preventScrollReset:u,viewTransition:d,...p},y)=>{let{unstable_useTransitions:k}=f.useContext($),w=Lr(),v=Pr(s,{relative:l}),g=i.toLowerCase()==="get"?"get":"post",M=typeof s=="string"&&Dt.test(s),m=b=>{if(c&&c(b),b.defaultPrevented)return;b.preventDefault();let C=b.nativeEvent.submitter,x=(C==null?void 0:C.getAttribute("formmethod"))||i,E=()=>w(C||b.currentTarget,{fetcherKey:t,method:x,navigate:n,replace:o,state:a,relative:l,preventScrollReset:u,viewTransition:d});k&&n!==!1?f.startTransition(()=>E()):E()};return f.createElement("form",{ref:y,method:g,action:v,onSubmit:r?c:m,...p,"data-discover":!M&&e==="render"?"true":void 0})});Cr.displayName="Form";function xr(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Vt(e){let t=f.useContext(Q);return N(t,xr(e)),t}function Er(e,{target:t,replace:n,state:r,preventScrollReset:o,relative:a,viewTransition:i,unstable_useTransitions:s}={}){let c=Ge(),l=H(),u=ie(e,{relative:a});return f.useCallback(d=>{if(or(d,t)){d.preventDefault();let p=n!==void 0?n:re(l)===re(u),y=()=>c(e,{replace:p,state:r,preventScrollReset:o,relative:a,viewTransition:i});s?f.startTransition(()=>y()):y()}},[l,c,u,n,r,t,e,o,a,i,s])}function Pi(e){R(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let t=f.useRef(je(e)),n=f.useRef(!1),r=H(),o=f.useMemo(()=>ar(r.search,n.current?null:t.current),[r.search]),a=Ge(),i=f.useCallback((s,c)=>{const l=je(typeof s=="function"?s(new URLSearchParams(o)):s);n.current=!0,a("?"+l,c)},[a,o]);return[o,i]}var Nr=0,Sr=()=>`__${String(++Nr)}__`;function Lr(){let{router:e}=Vt("useSubmit"),{basename:t}=f.useContext($),n=Yn(),r=e.fetch,o=e.navigate;return f.useCallback(async(a,i={})=>{let{action:s,method:c,encType:l,formData:u,body:d}=cr(a,t);if(i.navigate===!1){let p=i.fetcherKey||Sr();await r(p,n,i.action||s,{preventScrollReset:i.preventScrollReset,formData:u,body:d,formMethod:i.method||c,formEncType:i.encType||l,flushSync:i.flushSync})}else await o(i.action||s,{preventScrollReset:i.preventScrollReset,formData:u,body:d,formMethod:i.method||c,formEncType:i.encType||l,replace:i.replace,state:i.state,fromRouteId:n,flushSync:i.flushSync,viewTransition:i.viewTransition})},[r,o,t,n])}function Pr(e,{relative:t}={}){let{basename:n}=f.useContext($),r=f.useContext(B);N(r,"useFormAction must be used inside a RouteContext");let[o]=r.matches.slice(-1),a={...ie(e||".",{relative:t})},i=H();if(e==null){a.search=i.search;let s=new URLSearchParams(a.search),c=s.getAll("index");if(c.some(u=>u==="")){s.delete("index"),c.filter(d=>d).forEach(d=>s.append("index",d));let u=s.toString();a.search=u?`?${u}`:""}}return(!e||e===".")&&o.route.index&&(a.search=a.search?a.search.replace(/^\?/,"?index&"):"?index"),n!=="/"&&(a.pathname=a.pathname==="/"?n:j([n,a.pathname])),re(a)}function Rr(e,{relative:t}={}){let n=f.useContext(Rt);N(n!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=Vt("useViewTransitionState"),o=ie(e,{relative:t});if(!n.isTransitioning)return!1;let a=D(n.currentLocation.pathname,r)||n.currentLocation.pathname,i=D(n.nextLocation.pathname,r)||n.nextLocation.pathname;return fe(o.pathname,i)!=null||fe(o.pathname,a)!=null}const mt=e=>{let t;const n=new Set,r=(l,u)=>{const d=typeof l=="function"?l(t):l;if(!Object.is(d,t)){const p=t;t=u??(typeof d!="object"||d===null)?d:Object.assign({},t,d),n.forEach(y=>y(t,p))}},o=()=>t,s={setState:r,getState:o,getInitialState:()=>c,subscribe:l=>(n.add(l),()=>n.delete(l))},c=t=e(r,o,s);return s},Ar=e=>e?mt(e):mt,$r=e=>e;function Br(e,t=$r){const n=te.useSyncExternalStore(e.subscribe,te.useCallback(()=>t(e.getState()),[e,t]),te.useCallback(()=>t(e.getInitialState()),[e,t]));return te.useDebugValue(n),n}const gt=e=>{const t=Ar(e),n=r=>Br(t,r);return Object.assign(n,t),n},Ri=e=>e?gt(e):gt,Ir=(e,t)=>t.some(n=>e instanceof n);let kt,wt;function Tr(){return kt||(kt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function zr(){return wt||(wt=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ft=new WeakMap,De=new WeakMap,Ut=new WeakMap,xe=new WeakMap,tt=new WeakMap;function jr(e){const t=new Promise((n,r)=>{const o=()=>{e.removeEventListener("success",a),e.removeEventListener("error",i)},a=()=>{n(U(e.result)),o()},i=()=>{r(e.error),o()};e.addEventListener("success",a),e.addEventListener("error",i)});return t.then(n=>{n instanceof IDBCursor&&Ft.set(n,e)}).catch(()=>{}),tt.set(t,e),t}function Dr(e){if(De.has(e))return;const t=new Promise((n,r)=>{const o=()=>{e.removeEventListener("complete",a),e.removeEventListener("error",i),e.removeEventListener("abort",i)},a=()=>{n(),o()},i=()=>{r(e.error||new DOMException("AbortError","AbortError")),o()};e.addEventListener("complete",a),e.addEventListener("error",i),e.addEventListener("abort",i)});De.set(e,t)}let He={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return De.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Ut.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return U(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Hr(e){He=e(He)}function Vr(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(Ee(this),t,...n);return Ut.set(r,t.sort?t.sort():[t]),U(r)}:zr().includes(e)?function(...t){return e.apply(Ee(this),t),U(Ft.get(this))}:function(...t){return U(e.apply(Ee(this),t))}}function Fr(e){return typeof e=="function"?Vr(e):(e instanceof IDBTransaction&&Dr(e),Ir(e,Tr())?new Proxy(e,He):e)}function U(e){if(e instanceof IDBRequest)return jr(e);if(xe.has(e))return xe.get(e);const t=Fr(e);return t!==e&&(xe.set(e,t),tt.set(t,e)),t}const Ee=e=>tt.get(e);function Ai(e,t,{blocked:n,upgrade:r,blocking:o,terminated:a}={}){const i=indexedDB.open(e,t),s=U(i);return r&&i.addEventListener("upgradeneeded",c=>{r(U(i.result),c.oldVersion,c.newVersion,U(i.transaction),c)}),n&&i.addEventListener("blocked",c=>n(c.oldVersion,c.newVersion,c)),s.then(c=>{a&&c.addEventListener("close",()=>a()),o&&c.addEventListener("versionchange",l=>o(l.oldVersion,l.newVersion,l))}).catch(()=>{}),s}const Ur=["get","getKey","getAll","getAllKeys","count"],Or=["put","add","delete","clear"],Ne=new Map;function vt(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(Ne.get(t))return Ne.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,o=Or.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(o||Ur.includes(n)))return;const a=async function(i,...s){const c=this.transaction(i,o?"readwrite":"readonly");let l=c.store;return r&&(l=l.index(s.shift())),(await Promise.all([l[n](...s),o&&c.done]))[0]};return Ne.set(t,a),a}Hr(e=>({...e,get:(t,n,r)=>vt(t,n)||e.get(t,n,r),has:(t,n)=>!!vt(t,n)||e.has(t,n)}));function $i(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var o=0,r=Object.getOwnPropertySymbols(e);o<r.length;o++)t.indexOf(r[o])<0&&Object.prototype.propertyIsEnumerable.call(e,r[o])&&(n[r[o]]=e[r[o]]);return n}/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,r)=>r?r.toUpperCase():n.toLowerCase());/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=e=>{const t=Wr(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Se={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},Jr=f.createContext({}),Yr=()=>f.useContext(Jr),Gr=f.forwardRef(({color:e,size:t,strokeWidth:n,absoluteStrokeWidth:r,className:o="",children:a,iconNode:i,...s},c)=>{const{size:l=24,strokeWidth:u=2,absoluteStrokeWidth:d=!1,color:p="currentColor",className:y=""}=Yr()??{},k=r??d?Number(n??u)*24/Number(t??l):n??u;return f.createElement("svg",{ref:c,...Se,width:t??l??Se.width,height:t??l??Se.height,stroke:e??p,strokeWidth:k,className:Ot("lucide",y,o),...!a&&!Kr(s)&&{"aria-hidden":"true"},...s},[...i.map(([w,v])=>f.createElement(w,v)),...Array.isArray(a)?a:[a]])});/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=(e,t)=>{const n=f.forwardRef(({className:r,...o},a)=>f.createElement(Gr,{ref:a,iconNode:t,className:Ot(`lucide-${qr(Mt(e))}`,`lucide-${e}`,r),...o}));return n.displayName=Mt(e),n};/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],Bi=h("activity",Zr);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qr=[["path",{d:"M12 6v16",key:"nqf5sj"}],["path",{d:"m19 13 2-1a9 9 0 0 1-18 0l2 1",key:"y7qv08"}],["path",{d:"M9 11h6",key:"1fldmi"}],["circle",{cx:"12",cy:"4",r:"2",key:"muu5ef"}]],Ii=h("anchor",Qr);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]],Ti=h("arrow-down",Xr);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]],zi=h("arrow-left-right",eo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],ji=h("arrow-left",to);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Di=h("arrow-right",no);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]],Hi=h("arrow-up-right",ro);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],Vi=h("arrow-up",oo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["path",{d:"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z",key:"1l2ple"}],["path",{d:"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z",key:"1wam0m"}]],Fi=h("atom",ao);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]],Ui=h("award",io);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],Oi=h("bell",so);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]],qi=h("book-open",co);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]],Wi=h("box",lo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]],Ki=h("brain",uo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=[["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",key:"uouzyp"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M21 21a4 4 0 0 0-3.81-4",key:"1b0z45"}],["path",{d:"M21 5a4 4 0 0 1-3.55 3.97",key:"5cxbf6"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M3 21a4 4 0 0 1 3.81-4",key:"1fjd4g"}],["path",{d:"M3 5a4 4 0 0 0 3.55 3.97",key:"1d7oge"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M9 7.13V6a3 3 0 1 1 6 0v1.13",key:"1vgav8"}]],Ji=h("bug",ho);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],Yi=h("calculator",fo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],Gi=h("chart-column",po);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],Zi=h("check",yo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],Qi=h("chevron-down",mo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],Xi=h("chevron-left",go);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],es=h("chevron-right",ko);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]],ts=h("chevrons-left",wo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]],ns=h("chevrons-right",vo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=[["path",{d:"m17 11-5-5-5 5",key:"e8nh98"}],["path",{d:"m17 18-5-5-5 5",key:"2avn1x"}]],rs=h("chevrons-up",Mo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],os=h("circle-alert",bo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],as=h("circle-check",_o);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}]],is=h("circle-minus",Co);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]],ss=h("circle-plus",xo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],cs=h("circle-question-mark",Eo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=[["path",{d:"M17.925 20.056a6 6 0 0 0-11.851.001",key:"z69sun"}],["circle",{cx:"12",cy:"11",r:"4",key:"1gt34v"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],ls=h("circle-user-round",No);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],us=h("circle-x",So);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],hs=h("circle",Lo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]],ds=h("clock",Po);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"M16 14v6",key:"1j4efv"}],["path",{d:"M8 14v6",key:"17c4r9"}],["path",{d:"M12 16v6",key:"c8a4gj"}]],fs=h("cloud-rain",Ro);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]],ps=h("cloud",Ao);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",key:"9ktpf1"}]],ys=h("compass",$o);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],ms=h("copy",Bo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=[["path",{d:"M20 4v7a4 4 0 0 1-4 4H4",key:"6o5b7l"}],["path",{d:"m9 10-5 5 5 5",key:"1kshq7"}]],gs=h("corner-down-left",Io);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]],ks=h("crown",To);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],ws=h("database",zo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=[["path",{d:"M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z",key:"1yo7s0"}],["path",{d:"m12 9 6 6",key:"anjzzh"}],["path",{d:"m18 9-6 6",key:"1fp51s"}]],vs=h("delete",jo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["path",{d:"M16 8h.01",key:"cr5u4v"}],["path",{d:"M8 8h.01",key:"1e4136"}],["path",{d:"M8 16h.01",key:"18s6g9"}],["path",{d:"M16 16h.01",key:"1f9h7w"}]],Ms=h("dice-4",Do);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=[["rect",{width:"12",height:"12",x:"2",y:"10",rx:"2",ry:"2",key:"6agr2n"}],["path",{d:"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6",key:"1o487t"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"M10 14h.01",key:"ssrbsk"}],["path",{d:"M15 6h.01",key:"cblpky"}],["path",{d:"M18 9h.01",key:"2061c0"}]],bs=h("dices",Ho);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=[["path",{d:"m10 16 1.5 1.5",key:"11lckj"}],["path",{d:"m14 8-1.5-1.5",key:"1ohn8i"}],["path",{d:"M15 2c-1.798 1.998-2.518 3.995-2.807 5.993",key:"80uv8i"}],["path",{d:"m16.5 10.5 1 1",key:"696xn5"}],["path",{d:"m17 6-2.891-2.891",key:"xu6p2f"}],["path",{d:"M2 15c6.667-6 13.333 0 20-6",key:"1pyr53"}],["path",{d:"m20 9 .891.891",key:"3xwk7g"}],["path",{d:"M3.109 14.109 4 15",key:"q76aoh"}],["path",{d:"m6.5 12.5 1 1",key:"cs35ky"}],["path",{d:"m7 18 2.891 2.891",key:"1sisit"}],["path",{d:"M9 22c1.798-1.998 2.518-3.995 2.807-5.993",key:"q3hbxp"}]],_s=h("dna",Vo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],Cs=h("download",Fo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]],xs=h("droplets",Uo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]],Es=h("ellipsis",Oo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],Ns=h("external-link",qo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],Ss=h("eye-off",Wo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Ls=h("eye",Ko);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=[["path",{d:"M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z",key:"b19h5q"}],["path",{d:"M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z",key:"h7h5ge"}]],Ps=h("fast-forward",Jo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=[["path",{d:"M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z",key:"18jl4k"}],["path",{d:"M16 8 2 22",key:"vp34q"}],["path",{d:"M17.5 15H9",key:"1oz8nu"}]],Rs=h("feather",Yo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],As=h("file-text",Go);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=[["path",{d:"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z",key:"15baut"}],["path",{d:"M18 12v.5",key:"18hhni"}],["path",{d:"M16 17.93a9.77 9.77 0 0 1 0-11.86",key:"16dt7o"}],["path",{d:"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33",key:"l9di03"}],["path",{d:"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4",key:"1kjonw"}],["path",{d:"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98",key:"1zlm23"}]],$s=h("fish",Zo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=[["path",{d:"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",key:"1slcih"}]],Bs=h("flame",Qo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=[["path",{d:"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z",key:"1dudjm"}],["path",{d:"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z",key:"l2t8xc"}],["path",{d:"M16 17h4",key:"1dejxt"}],["path",{d:"M4 13h4",key:"1bwh8b"}]],Is=h("footprints",Xo);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2",key:"epbg0q"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]],Ts=h("frown",ea);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=[["line",{x1:"6",x2:"10",y1:"11",y2:"11",key:"1gktln"}],["line",{x1:"8",x2:"8",y1:"9",y2:"13",key:"qnk9ow"}],["line",{x1:"15",x2:"15.01",y1:"12",y2:"12",key:"krot7o"}],["line",{x1:"18",x2:"18.01",y1:"10",y2:"10",key:"1lcuu1"}],["path",{d:"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z",key:"mfqc10"}]],zs=h("gamepad-2",ta);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=[["path",{d:"m12 14 4-4",key:"9kzdfg"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0",key:"19p75a"}]],js=h("gauge",na);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=[["path",{d:"M9 10h.01",key:"qbtxuw"}],["path",{d:"M15 10h.01",key:"1qmjsl"}],["path",{d:"M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",key:"uwwb07"}]],Ds=h("ghost",ra);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8",key:"1sqzm4"}],["path",{d:"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5",key:"kc0143"}],["rect",{x:"3",y:"7",width:"18",height:"4",rx:"1",key:"1hberx"}]],Hs=h("gift",oa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]],Vs=h("globe",aa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=[["path",{d:"m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9",key:"1hayfq"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"15ts47"}]],Fs=h("hammer",ia);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=[["path",{d:"M12.035 17.012a3 3 0 0 0-3-3l-.311-.002a.72.72 0 0 1-.505-1.229l1.195-1.195A2 2 0 0 1 10.828 11H12a2 2 0 0 0 0-4H9.243a3 3 0 0 0-2.122.879l-2.707 2.707A4.83 4.83 0 0 0 3 14a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0",key:"1ff7rl"}],["path",{d:"M13.888 9.662A2 2 0 0 0 17 8V5A2 2 0 1 0 13 5",key:"1xmd21"}],["path",{d:"M9 5A2 2 0 1 0 5 5V10",key:"f3wfjw"}],["path",{d:"M9 7V4A2 2 0 1 1 13 4V7.268",key:"eaoucv"}]],Us=h("hand-fist",sa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],Os=h("heart",ca);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]],qs=h("history",la);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=[["path",{d:"M5 22h14",key:"ehvnwv"}],["path",{d:"M5 2h14",key:"pdyrp9"}],["path",{d:"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22",key:"1d314k"}],["path",{d:"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2",key:"1vvvr6"}]],Ws=h("hourglass",ua);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],Ks=h("house",ha);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],Js=h("image",da);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],Ys=h("info",fa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]],Gs=h("key-round",pa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],Zs=h("layers",ya);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],Qs=h("layout-grid",ma);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",key:"nnexq3"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",key:"mt58a7"}]],Xs=h("leaf",ga);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],ec=h("lightbulb",ka);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]],tc=h("link-2",wa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=[["path",{d:"M13 5h8",key:"a7qcls"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 19h8",key:"c3s6r1"}],["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}]],nc=h("list-checks",va);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=[["circle",{cx:"12",cy:"16",r:"1",key:"1au0dj"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2",key:"6s8ecr"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3",key:"1pqi11"}]],rc=h("lock-keyhole",Ma);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],oc=h("lock",ba);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],ac=h("log-out",_a);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8",key:"12jkf8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}],["path",{d:"m16 19 2 2 4-4",key:"1b14m6"}]],ic=h("mail-check",Ca);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],sc=h("map-pin",xa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=[["path",{d:"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",key:"169xi5"}],["path",{d:"M15 5.764v15",key:"1pn4in"}],["path",{d:"M9 3.236v15",key:"1uimfh"}]],cc=h("map",Ea);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=[["path",{d:"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",key:"143lza"}],["path",{d:"M11 12 5.12 2.2",key:"qhuxz6"}],["path",{d:"m13 12 5.88-9.8",key:"hbye0f"}],["path",{d:"M8 7h8",key:"i86dvs"}],["circle",{cx:"12",cy:"17",r:"5",key:"qbz8iq"}],["path",{d:"M12 18v-2h-.5",key:"fawc4q"}]],lc=h("medal",Na);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],uc=h("menu",Sa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}],["path",{d:"M8 12h.01",key:"czm47f"}],["path",{d:"M12 12h.01",key:"1mp3jc"}],["path",{d:"M16 12h.01",key:"1l6xoz"}]],hc=h("message-circle-more",La);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],dc=h("message-square",Pa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],fc=h("moon",Ra);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]],pc=h("music",Aa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $a=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],yc=h("package",$a);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ba=[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]],mc=h("palette",Ba);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=[["path",{d:"m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",key:"1miecu"}]],gc=h("paperclip",Ia);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],kc=h("pencil",Ta);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=[["path",{d:"M12 17v5",key:"bb1du9"}],["path",{d:"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",key:"1nkz8b"}]],wc=h("pin",za);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],vc=h("plus",ja);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=[["path",{d:"M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",key:"w46dr5"}]],Mc=h("puzzle",Da);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=[["path",{d:"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"rib7q0"}],["path",{d:"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"1ymkrd"}]],bc=h("quote",Ha);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],_c=h("refresh-cw",Va);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=[["path",{d:"m17 2 4 4-4 4",key:"nntrym"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14",key:"84bu3i"}],["path",{d:"m7 22-4-4 4-4",key:"1wqhfi"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3",key:"1rx37r"}]],Cc=h("repeat",Fa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=[["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4",key:"5vmcpk"}],["path",{d:"m9 17-5-5 5-5",key:"nvlc11"}]],xc=h("reply",Ua);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],Ec=h("rotate-ccw",Oa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qa=[["circle",{cx:"6",cy:"19",r:"3",key:"1kj8tv"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",key:"1d8sl"}],["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}]],Nc=h("route",qa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=[["path",{d:"M10 2v3a1 1 0 0 0 1 1h5",key:"1xspal"}],["path",{d:"M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6",key:"1ra60u"}],["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z",key:"1yve0x"}]],Sc=h("save-all",Wa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],Lc=h("save",Ka);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=[["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"m19 8 3 8a5 5 0 0 1-6 0zV7",key:"zcdpyk"}],["path",{d:"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",key:"1yorad"}],["path",{d:"m5 8 3 8a5 5 0 0 1-6 0zV7",key:"eua70x"}],["path",{d:"M7 21h10",key:"1b0cd5"}]],Pc=h("scale",Ja);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=[["path",{d:"M15 12h-5",key:"r7krc0"}],["path",{d:"M15 8h-5",key:"1khuty"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]],Rc=h("scroll-text",Ya);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=[["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]],Ac=h("scroll",Ga);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],$c=h("search",Za);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=[["path",{d:"M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z",key:"117uat"}],["path",{d:"M6 12h16",key:"s4cdu5"}]],Bc=h("send-horizontal",Qa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Ic=h("settings",Xa);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e1=[["path",{d:"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z",key:"1bo67w"}],["rect",{x:"3",y:"14",width:"7",height:"7",rx:"1",key:"1bkyp8"}],["circle",{cx:"17.5",cy:"17.5",r:"3.5",key:"w3z12y"}]],Tc=h("shapes",e1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t1=[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]],zc=h("share-2",t1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n1=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]],jc=h("shield-alert",n1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r1=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],Dc=h("shield-check",r1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o1=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 22V2",key:"zs6s6o"}]],Hc=h("shield-half",o1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a1=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],Vc=h("shield",a1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i1=[["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}],["path",{d:"M3.103 6.034h17.794",key:"awc11p"}],["path",{d:"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",key:"o988cm"}]],Fc=h("shopping-bag",i1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s1=[["path",{d:"m12.5 17-.5-1-.5 1h1z",key:"3me087"}],["path",{d:"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",key:"1o5pge"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}]],Uc=h("skull",s1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c1=[["path",{d:"M10 5H3",key:"1qgfaw"}],["path",{d:"M12 19H3",key:"yhmn1j"}],["path",{d:"M14 3v4",key:"1sua03"}],["path",{d:"M16 17v4",key:"1q0r14"}],["path",{d:"M21 12h-9",key:"1o4lsq"}],["path",{d:"M21 19h-5",key:"1rlt1p"}],["path",{d:"M21 5h-7",key:"1oszz2"}],["path",{d:"M8 10v4",key:"tgpxqk"}],["path",{d:"M8 12H3",key:"a7s4jb"}]],Oc=h("sliders-horizontal",c1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l1=[["path",{d:"m10 20-1.25-2.5L6 18",key:"18frcb"}],["path",{d:"M10 4 8.75 6.5 6 6",key:"7mghy3"}],["path",{d:"m14 20 1.25-2.5L18 18",key:"1chtki"}],["path",{d:"m14 4 1.25 2.5L18 6",key:"1b4wsy"}],["path",{d:"m17 21-3-6h-4",key:"15hhxa"}],["path",{d:"m17 3-3 6 1.5 3",key:"11697g"}],["path",{d:"M2 12h6.5L10 9",key:"kv9z4n"}],["path",{d:"m20 10-1.5 2 1.5 2",key:"1swlpi"}],["path",{d:"M22 12h-6.5L14 15",key:"1mxi28"}],["path",{d:"m4 10 1.5 2L4 14",key:"k9enpj"}],["path",{d:"m7 21 3-6-1.5-3",key:"j8hb9u"}],["path",{d:"m7 3 3 6h4",key:"1otusx"}]],qc=h("snowflake",l1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u1=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],Wc=h("sparkles",u1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h1=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],Kc=h("square-pen",h1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d1=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],Jc=h("star",d1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f1=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],Yc=h("sun",f1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p1=[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5",key:"1hfsw2"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13",key:"1vrmhu"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20",key:"1bron3"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19",key:"13pww6"}],["polyline",{points:"14.5 6.5 18 3 21 3 21 6 17.5 9.5",key:"hbey2j"}],["line",{x1:"5",x2:"9",y1:"14",y2:"18",key:"1hf58s"}],["line",{x1:"7",x2:"4",y1:"17",y2:"20",key:"pidxm4"}],["line",{x1:"3",x2:"5",y1:"19",y2:"21",key:"1pehsh"}]],Gc=h("swords",p1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],Zc=h("target",y1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m1=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],Qc=h("trash-2",m1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g1=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],Xc=h("trending-up",g1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k1=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],el=h("triangle-alert",k1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w1=[["path",{d:"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978",key:"1n3hpd"}],["path",{d:"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978",key:"rfe1zi"}],["path",{d:"M18 9h1.5a1 1 0 0 0 0-5H18",key:"7xy6bh"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",key:"1mhfuq"}],["path",{d:"M6 9H4.5a1 1 0 0 1 0-5H6",key:"tex48p"}]],tl=h("trophy",w1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v1=[["path",{d:"M12 4v16",key:"1654pz"}],["path",{d:"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2",key:"e0r10z"}],["path",{d:"M9 20h6",key:"s66wpe"}]],nl=h("type",v1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M1=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],rl=h("user-plus",M1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b1=[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]],ol=h("user-round",b1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _1=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],al=h("users",_1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C1=[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]],il=h("volume-2",C1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x1=[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15",key:"1ewh16"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15",key:"5ykzw1"}]],sl=h("volume-x",x1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E1=[["path",{d:"M2 12q2.5 2 5 0t5 0 5 0 5 0",key:"8ddzzs"}],["path",{d:"M2 19q2.5 2 5 0t5 0 5 0 5 0",key:"1wj4st"}],["path",{d:"M2 5q2.5 2 5 0t5 0 5 0 5 0",key:"69x50u"}]],cl=h("waves-horizontal",E1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N1=[["path",{d:"M12.8 19.6A2 2 0 1 0 14 16H2",key:"148xed"}],["path",{d:"M17.5 8a2.5 2.5 0 1 1 2 4H2",key:"1u4tom"}],["path",{d:"M9.8 4.4A2 2 0 1 1 11 8H2",key:"75valh"}]],ll=h("wind",N1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S1=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],ul=h("x",S1);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L1=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],hl=h("zap",L1);try{self["workbox:window:7.4.0"]&&_()}catch{}function Ve(e,t){return new Promise(function(n){var r=new MessageChannel;r.port1.onmessage=function(o){n(o.data)},e.postMessage(t,[r.port2])})}function bt(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=Array(t);n<t;n++)r[n]=e[n];return r}function P1(e,t,n){return t&&function(r,o){for(var a=0;a<o.length;a++){var i=o[a];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(r,A1(i.key),i)}}(e.prototype,t),Object.defineProperty(e,"prototype",{writable:!1}),e}function R1(e,t){var n=typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n)return(n=n.call(e)).next.bind(n);if(Array.isArray(e)||(n=function(o,a){if(o){if(typeof o=="string")return bt(o,a);var i={}.toString.call(o).slice(8,-1);return i==="Object"&&o.constructor&&(i=o.constructor.name),i==="Map"||i==="Set"?Array.from(o):i==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)?bt(o,a):void 0}}(e))||t){n&&(e=n);var r=0;return function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Fe(e,t){return Fe=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,r){return n.__proto__=r,n},Fe(e,t)}function A1(e){var t=function(n,r){if(typeof n!="object"||!n)return n;var o=n[Symbol.toPrimitive];if(o!==void 0){var a=o.call(n,r);if(typeof a!="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(n)}(e,"string");return typeof t=="symbol"?t:t+""}try{self["workbox:core:7.4.0"]&&_()}catch{}var Le=function(){var e=this;this.promise=new Promise(function(t,n){e.resolve=t,e.reject=n})};function Pe(e,t){var n=location.href;return new URL(e,n).href===new URL(t,n).href}var W=function(e,t){this.type=e,Object.assign(this,t)};function V(e,t,n){return e&&e.then||(e=Promise.resolve(e)),t?e.then(t):e}function $1(){}var B1={type:"SKIP_WAITING"};function _t(e,t){return e&&e.then?e.then($1):Promise.resolve()}var I1=function(e){function t(a,i){var s,c;return i===void 0&&(i={}),(s=e.call(this)||this).nn={},s.tn=0,s.rn=new Le,s.en=new Le,s.on=new Le,s.un=0,s.an=new Set,s.cn=function(){var l=s.fn,u=l.installing;s.tn>0||!Pe(u.scriptURL,s.sn.toString())||performance.now()>s.un+6e4?(s.vn=u,l.removeEventListener("updatefound",s.cn)):(s.hn=u,s.an.add(u),s.rn.resolve(u)),++s.tn,u.addEventListener("statechange",s.ln)},s.ln=function(l){var u=s.fn,d=l.target,p=d.state,y=d===s.vn,k={sw:d,isExternal:y,originalEvent:l};!y&&s.mn&&(k.isUpdate=!0),s.dispatchEvent(new W(p,k)),p==="installed"?s.wn=self.setTimeout(function(){p==="installed"&&u.waiting===d&&s.dispatchEvent(new W("waiting",k))},200):p==="activating"&&(clearTimeout(s.wn),y||s.en.resolve(d))},s.yn=function(l){var u=s.hn,d=u!==navigator.serviceWorker.controller;s.dispatchEvent(new W("controlling",{isExternal:d,originalEvent:l,sw:u,isUpdate:s.mn})),d||s.on.resolve(u)},s.gn=(c=function(l){var u=l.data,d=l.ports,p=l.source;return V(s.getSW(),function(){s.an.has(p)&&s.dispatchEvent(new W("message",{data:u,originalEvent:l,ports:d,sw:p}))})},function(){for(var l=[],u=0;u<arguments.length;u++)l[u]=arguments[u];try{return Promise.resolve(c.apply(this,l))}catch(d){return Promise.reject(d)}}),s.sn=a,s.nn=i,navigator.serviceWorker.addEventListener("message",s.gn),s}var n,r;r=e,(n=t).prototype=Object.create(r.prototype),n.prototype.constructor=n,Fe(n,r);var o=t.prototype;return o.register=function(a){var i=(a===void 0?{}:a).immediate,s=i!==void 0&&i;try{var c=this;return V(function(l,u){var d=l();return d&&d.then?d.then(u):u(d)}(function(){if(!s&&document.readyState!=="complete")return _t(new Promise(function(l){return window.addEventListener("load",l)}))},function(){return c.mn=!!navigator.serviceWorker.controller,c.dn=c.pn(),V(c.bn(),function(l){c.fn=l,c.dn&&(c.hn=c.dn,c.en.resolve(c.dn),c.on.resolve(c.dn),c.dn.addEventListener("statechange",c.ln,{once:!0}));var u=c.fn.waiting;return u&&Pe(u.scriptURL,c.sn.toString())&&(c.hn=u,Promise.resolve().then(function(){c.dispatchEvent(new W("waiting",{sw:u,wasWaitingBeforeRegister:!0}))}).then(function(){})),c.hn&&(c.rn.resolve(c.hn),c.an.add(c.hn)),c.fn.addEventListener("updatefound",c.cn),navigator.serviceWorker.addEventListener("controllerchange",c.yn),c.fn})}))}catch(l){return Promise.reject(l)}},o.update=function(){try{return this.fn?V(_t(this.fn.update())):V()}catch(a){return Promise.reject(a)}},o.getSW=function(){return this.hn!==void 0?Promise.resolve(this.hn):this.rn.promise},o.messageSW=function(a){try{return V(this.getSW(),function(i){return Ve(i,a)})}catch(i){return Promise.reject(i)}},o.messageSkipWaiting=function(){this.fn&&this.fn.waiting&&Ve(this.fn.waiting,B1)},o.pn=function(){var a=navigator.serviceWorker.controller;return a&&Pe(a.scriptURL,this.sn.toString())?a:void 0},o.bn=function(){try{var a=this;return V(function(i,s){try{var c=i()}catch(l){return s(l)}return c&&c.then?c.then(void 0,s):c}(function(){return V(navigator.serviceWorker.register(a.sn,a.nn),function(i){return a.un=performance.now(),i})},function(i){throw i}))}catch(i){return Promise.reject(i)}},P1(t,[{key:"active",get:function(){return this.en.promise}},{key:"controlling",get:function(){return this.on.promise}}])}(function(){function e(){this.Pn=new Map}var t=e.prototype;return t.addEventListener=function(n,r){this.jn(n).add(r)},t.removeEventListener=function(n,r){this.jn(n).delete(r)},t.dispatchEvent=function(n){n.target=this;for(var r,o=R1(this.jn(n.type));!(r=o()).done;)(0,r.value)(n)},t.jn=function(n){return this.Pn.has(n)||this.Pn.set(n,new Set),this.Pn.get(n)},e}());const dl=Object.freeze(Object.defineProperty({__proto__:null,Workbox:I1,WorkboxEvent:W,messageSW:Ve},Symbol.toStringTag,{value:"Module"}));var ke={},T1=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then},qt={},A={};let nt;const z1=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];A.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17};A.getSymbolTotalCodewords=function(t){return z1[t]};A.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t};A.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');nt=t};A.isKanjiModeEnabled=function(){return typeof nt<"u"};A.toSJIS=function(t){return nt(t)};var we={};(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+n)}}e.isValid=function(r){return r&&typeof r.bit<"u"&&r.bit>=0&&r.bit<4},e.from=function(r,o){if(e.isValid(r))return r;try{return t(r)}catch{return o}}})(we);function Wt(){this.buffer=[],this.length=0}Wt.prototype={get:function(e){const t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)===1},put:function(e,t){for(let n=0;n<t;n++)this.putBit((e>>>t-n-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(e){const t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}};var j1=Wt;function se(e){if(!e||e<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}se.prototype.set=function(e,t,n,r){const o=e*this.size+t;this.data[o]=n,r&&(this.reservedBit[o]=!0)};se.prototype.get=function(e,t){return this.data[e*this.size+t]};se.prototype.xor=function(e,t,n){this.data[e*this.size+t]^=n};se.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]};var D1=se,Kt={};(function(e){const t=A.getSymbolSize;e.getRowColCoords=function(r){if(r===1)return[];const o=Math.floor(r/7)+2,a=t(r),i=a===145?26:Math.ceil((a-13)/(2*o-2))*2,s=[a-7];for(let c=1;c<o-1;c++)s[c]=s[c-1]-i;return s.push(6),s.reverse()},e.getPositions=function(r){const o=[],a=e.getRowColCoords(r),i=a.length;for(let s=0;s<i;s++)for(let c=0;c<i;c++)s===0&&c===0||s===0&&c===i-1||s===i-1&&c===0||o.push([a[s],a[c]]);return o}})(Kt);var Jt={};const H1=A.getSymbolSize,Ct=7;Jt.getPositions=function(t){const n=H1(t);return[[0,0],[n-Ct,0],[0,n-Ct]]};var Yt={};(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(o){return o!=null&&o!==""&&!isNaN(o)&&o>=0&&o<=7},e.from=function(o){return e.isValid(o)?parseInt(o,10):void 0},e.getPenaltyN1=function(o){const a=o.size;let i=0,s=0,c=0,l=null,u=null;for(let d=0;d<a;d++){s=c=0,l=u=null;for(let p=0;p<a;p++){let y=o.get(d,p);y===l?s++:(s>=5&&(i+=t.N1+(s-5)),l=y,s=1),y=o.get(p,d),y===u?c++:(c>=5&&(i+=t.N1+(c-5)),u=y,c=1)}s>=5&&(i+=t.N1+(s-5)),c>=5&&(i+=t.N1+(c-5))}return i},e.getPenaltyN2=function(o){const a=o.size;let i=0;for(let s=0;s<a-1;s++)for(let c=0;c<a-1;c++){const l=o.get(s,c)+o.get(s,c+1)+o.get(s+1,c)+o.get(s+1,c+1);(l===4||l===0)&&i++}return i*t.N2},e.getPenaltyN3=function(o){const a=o.size;let i=0,s=0,c=0;for(let l=0;l<a;l++){s=c=0;for(let u=0;u<a;u++)s=s<<1&2047|o.get(l,u),u>=10&&(s===1488||s===93)&&i++,c=c<<1&2047|o.get(u,l),u>=10&&(c===1488||c===93)&&i++}return i*t.N3},e.getPenaltyN4=function(o){let a=0;const i=o.data.length;for(let c=0;c<i;c++)a+=o.data[c];return Math.abs(Math.ceil(a*100/i/5)-10)*t.N4};function n(r,o,a){switch(r){case e.Patterns.PATTERN000:return(o+a)%2===0;case e.Patterns.PATTERN001:return o%2===0;case e.Patterns.PATTERN010:return a%3===0;case e.Patterns.PATTERN011:return(o+a)%3===0;case e.Patterns.PATTERN100:return(Math.floor(o/2)+Math.floor(a/3))%2===0;case e.Patterns.PATTERN101:return o*a%2+o*a%3===0;case e.Patterns.PATTERN110:return(o*a%2+o*a%3)%2===0;case e.Patterns.PATTERN111:return(o*a%3+(o+a)%2)%2===0;default:throw new Error("bad maskPattern:"+r)}}e.applyMask=function(o,a){const i=a.size;for(let s=0;s<i;s++)for(let c=0;c<i;c++)a.isReserved(c,s)||a.xor(c,s,n(o,c,s))},e.getBestMask=function(o,a){const i=Object.keys(e.Patterns).length;let s=0,c=1/0;for(let l=0;l<i;l++){a(l),e.applyMask(l,o);const u=e.getPenaltyN1(o)+e.getPenaltyN2(o)+e.getPenaltyN3(o)+e.getPenaltyN4(o);e.applyMask(l,o),u<c&&(c=u,s=l)}return s}})(Yt);var ve={};const F=we,le=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],ue=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];ve.getBlocksCount=function(t,n){switch(n){case F.L:return le[(t-1)*4+0];case F.M:return le[(t-1)*4+1];case F.Q:return le[(t-1)*4+2];case F.H:return le[(t-1)*4+3];default:return}};ve.getTotalCodewordsCount=function(t,n){switch(n){case F.L:return ue[(t-1)*4+0];case F.M:return ue[(t-1)*4+1];case F.Q:return ue[(t-1)*4+2];case F.H:return ue[(t-1)*4+3];default:return}};var Gt={},Me={};const ne=new Uint8Array(512),pe=new Uint8Array(256);(function(){let t=1;for(let n=0;n<255;n++)ne[n]=t,pe[t]=n,t<<=1,t&256&&(t^=285);for(let n=255;n<512;n++)ne[n]=ne[n-255]})();Me.log=function(t){if(t<1)throw new Error("log("+t+")");return pe[t]};Me.exp=function(t){return ne[t]};Me.mul=function(t,n){return t===0||n===0?0:ne[pe[t]+pe[n]]};(function(e){const t=Me;e.mul=function(r,o){const a=new Uint8Array(r.length+o.length-1);for(let i=0;i<r.length;i++)for(let s=0;s<o.length;s++)a[i+s]^=t.mul(r[i],o[s]);return a},e.mod=function(r,o){let a=new Uint8Array(r);for(;a.length-o.length>=0;){const i=a[0];for(let c=0;c<o.length;c++)a[c]^=t.mul(o[c],i);let s=0;for(;s<a.length&&a[s]===0;)s++;a=a.slice(s)}return a},e.generateECPolynomial=function(r){let o=new Uint8Array([1]);for(let a=0;a<r;a++)o=e.mul(o,new Uint8Array([1,t.exp(a)]));return o}})(Gt);const Zt=Gt;function rt(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}rt.prototype.initialize=function(t){this.degree=t,this.genPoly=Zt.generateECPolynomial(this.degree)};rt.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");const n=new Uint8Array(t.length+this.degree);n.set(t);const r=Zt.mod(n,this.genPoly),o=this.degree-r.length;if(o>0){const a=new Uint8Array(this.degree);return a.set(r,o),a}return r};var V1=rt,Qt={},O={},ot={};ot.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40};var T={};const Xt="[0-9]+",F1="[A-Z $%*+\\-./:]+";let oe="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";oe=oe.replace(/u/g,"\\u");const U1="(?:(?![A-Z0-9 $%*+\\-./:]|"+oe+`)(?:.|[\r
]))+`;T.KANJI=new RegExp(oe,"g");T.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");T.BYTE=new RegExp(U1,"g");T.NUMERIC=new RegExp(Xt,"g");T.ALPHANUMERIC=new RegExp(F1,"g");const O1=new RegExp("^"+oe+"$"),q1=new RegExp("^"+Xt+"$"),W1=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");T.testKanji=function(t){return O1.test(t)};T.testNumeric=function(t){return q1.test(t)};T.testAlphanumeric=function(t){return W1.test(t)};(function(e){const t=ot,n=T;e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(a,i){if(!a.ccBits)throw new Error("Invalid mode: "+a);if(!t.isValid(i))throw new Error("Invalid version: "+i);return i>=1&&i<10?a.ccBits[0]:i<27?a.ccBits[1]:a.ccBits[2]},e.getBestModeForData=function(a){return n.testNumeric(a)?e.NUMERIC:n.testAlphanumeric(a)?e.ALPHANUMERIC:n.testKanji(a)?e.KANJI:e.BYTE},e.toString=function(a){if(a&&a.id)return a.id;throw new Error("Invalid mode")},e.isValid=function(a){return a&&a.bit&&a.ccBits};function r(o){if(typeof o!="string")throw new Error("Param is not a string");switch(o.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+o)}}e.from=function(a,i){if(e.isValid(a))return a;try{return r(a)}catch{return i}}})(O);(function(e){const t=A,n=ve,r=we,o=O,a=ot,i=7973,s=t.getBCHDigit(i);function c(p,y,k){for(let w=1;w<=40;w++)if(y<=e.getCapacity(w,k,p))return w}function l(p,y){return o.getCharCountIndicator(p,y)+4}function u(p,y){let k=0;return p.forEach(function(w){const v=l(w.mode,y);k+=v+w.getBitsLength()}),k}function d(p,y){for(let k=1;k<=40;k++)if(u(p,k)<=e.getCapacity(k,y,o.MIXED))return k}e.from=function(y,k){return a.isValid(y)?parseInt(y,10):k},e.getCapacity=function(y,k,w){if(!a.isValid(y))throw new Error("Invalid QR Code version");typeof w>"u"&&(w=o.BYTE);const v=t.getSymbolTotalCodewords(y),g=n.getTotalCodewordsCount(y,k),M=(v-g)*8;if(w===o.MIXED)return M;const m=M-l(w,y);switch(w){case o.NUMERIC:return Math.floor(m/10*3);case o.ALPHANUMERIC:return Math.floor(m/11*2);case o.KANJI:return Math.floor(m/13);case o.BYTE:default:return Math.floor(m/8)}},e.getBestVersionForData=function(y,k){let w;const v=r.from(k,r.M);if(Array.isArray(y)){if(y.length>1)return d(y,v);if(y.length===0)return 1;w=y[0]}else w=y;return c(w.mode,w.getLength(),v)},e.getEncodedBits=function(y){if(!a.isValid(y)||y<7)throw new Error("Invalid QR Code version");let k=y<<12;for(;t.getBCHDigit(k)-s>=0;)k^=i<<t.getBCHDigit(k)-s;return y<<12|k}})(Qt);var en={};const Ue=A,tn=1335,K1=21522,xt=Ue.getBCHDigit(tn);en.getEncodedBits=function(t,n){const r=t.bit<<3|n;let o=r<<10;for(;Ue.getBCHDigit(o)-xt>=0;)o^=tn<<Ue.getBCHDigit(o)-xt;return(r<<10|o)^K1};var nn={};const J1=O;function K(e){this.mode=J1.NUMERIC,this.data=e.toString()}K.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)};K.prototype.getLength=function(){return this.data.length};K.prototype.getBitsLength=function(){return K.getBitsLength(this.data.length)};K.prototype.write=function(t){let n,r,o;for(n=0;n+3<=this.data.length;n+=3)r=this.data.substr(n,3),o=parseInt(r,10),t.put(o,10);const a=this.data.length-n;a>0&&(r=this.data.substr(n),o=parseInt(r,10),t.put(o,a*3+1))};var Y1=K;const G1=O,Re=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function J(e){this.mode=G1.ALPHANUMERIC,this.data=e}J.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)};J.prototype.getLength=function(){return this.data.length};J.prototype.getBitsLength=function(){return J.getBitsLength(this.data.length)};J.prototype.write=function(t){let n;for(n=0;n+2<=this.data.length;n+=2){let r=Re.indexOf(this.data[n])*45;r+=Re.indexOf(this.data[n+1]),t.put(r,11)}this.data.length%2&&t.put(Re.indexOf(this.data[n]),6)};var Z1=J;const Q1=O;function Y(e){this.mode=Q1.BYTE,typeof e=="string"?this.data=new TextEncoder().encode(e):this.data=new Uint8Array(e)}Y.getBitsLength=function(t){return t*8};Y.prototype.getLength=function(){return this.data.length};Y.prototype.getBitsLength=function(){return Y.getBitsLength(this.data.length)};Y.prototype.write=function(e){for(let t=0,n=this.data.length;t<n;t++)e.put(this.data[t],8)};var X1=Y;const ei=O,ti=A;function G(e){this.mode=ei.KANJI,this.data=e}G.getBitsLength=function(t){return t*13};G.prototype.getLength=function(){return this.data.length};G.prototype.getBitsLength=function(){return G.getBitsLength(this.data.length)};G.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let n=ti.toSJIS(this.data[t]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),e.put(n,13)}};var ni=G,rn={exports:{}};(function(e){var t={single_source_shortest_paths:function(n,r,o){var a={},i={};i[r]=0;var s=t.PriorityQueue.make();s.push(r,0);for(var c,l,u,d,p,y,k,w,v;!s.empty();){c=s.pop(),l=c.value,d=c.cost,p=n[l]||{};for(u in p)p.hasOwnProperty(u)&&(y=p[u],k=d+y,w=i[u],v=typeof i[u]>"u",(v||w>k)&&(i[u]=k,s.push(u,k),a[u]=l))}if(typeof o<"u"&&typeof i[o]>"u"){var g=["Could not find a path from ",r," to ",o,"."].join("");throw new Error(g)}return a},extract_shortest_path_from_predecessor_list:function(n,r){for(var o=[],a=r;a;)o.push(a),n[a],a=n[a];return o.reverse(),o},find_path:function(n,r,o){var a=t.single_source_shortest_paths(n,r,o);return t.extract_shortest_path_from_predecessor_list(a,o)},PriorityQueue:{make:function(n){var r=t.PriorityQueue,o={},a;n=n||{};for(a in r)r.hasOwnProperty(a)&&(o[a]=r[a]);return o.queue=[],o.sorter=n.sorter||r.default_sorter,o},default_sorter:function(n,r){return n.cost-r.cost},push:function(n,r){var o={value:n,cost:r};this.queue.push(o),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};e.exports=t})(rn);var ri=rn.exports;(function(e){const t=O,n=Y1,r=Z1,o=X1,a=ni,i=T,s=A,c=ri;function l(g){return unescape(encodeURIComponent(g)).length}function u(g,M,m){const b=[];let C;for(;(C=g.exec(m))!==null;)b.push({data:C[0],index:C.index,mode:M,length:C[0].length});return b}function d(g){const M=u(i.NUMERIC,t.NUMERIC,g),m=u(i.ALPHANUMERIC,t.ALPHANUMERIC,g);let b,C;return s.isKanjiModeEnabled()?(b=u(i.BYTE,t.BYTE,g),C=u(i.KANJI,t.KANJI,g)):(b=u(i.BYTE_KANJI,t.BYTE,g),C=[]),M.concat(m,b,C).sort(function(E,L){return E.index-L.index}).map(function(E){return{data:E.data,mode:E.mode,length:E.length}})}function p(g,M){switch(M){case t.NUMERIC:return n.getBitsLength(g);case t.ALPHANUMERIC:return r.getBitsLength(g);case t.KANJI:return a.getBitsLength(g);case t.BYTE:return o.getBitsLength(g)}}function y(g){return g.reduce(function(M,m){const b=M.length-1>=0?M[M.length-1]:null;return b&&b.mode===m.mode?(M[M.length-1].data+=m.data,M):(M.push(m),M)},[])}function k(g){const M=[];for(let m=0;m<g.length;m++){const b=g[m];switch(b.mode){case t.NUMERIC:M.push([b,{data:b.data,mode:t.ALPHANUMERIC,length:b.length},{data:b.data,mode:t.BYTE,length:b.length}]);break;case t.ALPHANUMERIC:M.push([b,{data:b.data,mode:t.BYTE,length:b.length}]);break;case t.KANJI:M.push([b,{data:b.data,mode:t.BYTE,length:l(b.data)}]);break;case t.BYTE:M.push([{data:b.data,mode:t.BYTE,length:l(b.data)}])}}return M}function w(g,M){const m={},b={start:{}};let C=["start"];for(let x=0;x<g.length;x++){const E=g[x],L=[];for(let P=0;P<E.length;P++){const S=E[P],I=""+x+P;L.push(I),m[I]={node:S,lastCount:0},b[I]={};for(let q=0;q<C.length;q++){const z=C[q];m[z]&&m[z].node.mode===S.mode?(b[z][I]=p(m[z].lastCount+S.length,S.mode)-p(m[z].lastCount,S.mode),m[z].lastCount+=S.length):(m[z]&&(m[z].lastCount=S.length),b[z][I]=p(S.length,S.mode)+4+t.getCharCountIndicator(S.mode,M))}}C=L}for(let x=0;x<C.length;x++)b[C[x]].end=0;return{map:b,table:m}}function v(g,M){let m;const b=t.getBestModeForData(g);if(m=t.from(M,b),m!==t.BYTE&&m.bit<b.bit)throw new Error('"'+g+'" cannot be encoded with mode '+t.toString(m)+`.
 Suggested mode is: `+t.toString(b));switch(m===t.KANJI&&!s.isKanjiModeEnabled()&&(m=t.BYTE),m){case t.NUMERIC:return new n(g);case t.ALPHANUMERIC:return new r(g);case t.KANJI:return new a(g);case t.BYTE:return new o(g)}}e.fromArray=function(M){return M.reduce(function(m,b){return typeof b=="string"?m.push(v(b,null)):b.data&&m.push(v(b.data,b.mode)),m},[])},e.fromString=function(M,m){const b=d(M,s.isKanjiModeEnabled()),C=k(b),x=w(C,m),E=c.find_path(x.map,"start","end"),L=[];for(let P=1;P<E.length-1;P++)L.push(x.table[E[P]].node);return e.fromArray(y(L))},e.rawSplit=function(M){return e.fromArray(d(M,s.isKanjiModeEnabled()))}})(nn);const be=A,Ae=we,oi=j1,ai=D1,ii=Kt,si=Jt,Oe=Yt,qe=ve,ci=V1,ye=Qt,li=en,ui=O,$e=nn;function hi(e,t){const n=e.size,r=si.getPositions(t);for(let o=0;o<r.length;o++){const a=r[o][0],i=r[o][1];for(let s=-1;s<=7;s++)if(!(a+s<=-1||n<=a+s))for(let c=-1;c<=7;c++)i+c<=-1||n<=i+c||(s>=0&&s<=6&&(c===0||c===6)||c>=0&&c<=6&&(s===0||s===6)||s>=2&&s<=4&&c>=2&&c<=4?e.set(a+s,i+c,!0,!0):e.set(a+s,i+c,!1,!0))}}function di(e){const t=e.size;for(let n=8;n<t-8;n++){const r=n%2===0;e.set(n,6,r,!0),e.set(6,n,r,!0)}}function fi(e,t){const n=ii.getPositions(t);for(let r=0;r<n.length;r++){const o=n[r][0],a=n[r][1];for(let i=-2;i<=2;i++)for(let s=-2;s<=2;s++)i===-2||i===2||s===-2||s===2||i===0&&s===0?e.set(o+i,a+s,!0,!0):e.set(o+i,a+s,!1,!0)}}function pi(e,t){const n=e.size,r=ye.getEncodedBits(t);let o,a,i;for(let s=0;s<18;s++)o=Math.floor(s/3),a=s%3+n-8-3,i=(r>>s&1)===1,e.set(o,a,i,!0),e.set(a,o,i,!0)}function Be(e,t,n){const r=e.size,o=li.getEncodedBits(t,n);let a,i;for(a=0;a<15;a++)i=(o>>a&1)===1,a<6?e.set(a,8,i,!0):a<8?e.set(a+1,8,i,!0):e.set(r-15+a,8,i,!0),a<8?e.set(8,r-a-1,i,!0):a<9?e.set(8,15-a-1+1,i,!0):e.set(8,15-a-1,i,!0);e.set(r-8,8,1,!0)}function yi(e,t){const n=e.size;let r=-1,o=n-1,a=7,i=0;for(let s=n-1;s>0;s-=2)for(s===6&&s--;;){for(let c=0;c<2;c++)if(!e.isReserved(o,s-c)){let l=!1;i<t.length&&(l=(t[i]>>>a&1)===1),e.set(o,s-c,l),a--,a===-1&&(i++,a=7)}if(o+=r,o<0||n<=o){o-=r,r=-r;break}}}function mi(e,t,n){const r=new oi;n.forEach(function(c){r.put(c.mode.bit,4),r.put(c.getLength(),ui.getCharCountIndicator(c.mode,e)),c.write(r)});const o=be.getSymbolTotalCodewords(e),a=qe.getTotalCodewordsCount(e,t),i=(o-a)*8;for(r.getLengthInBits()+4<=i&&r.put(0,4);r.getLengthInBits()%8!==0;)r.putBit(0);const s=(i-r.getLengthInBits())/8;for(let c=0;c<s;c++)r.put(c%2?17:236,8);return gi(r,e,t)}function gi(e,t,n){const r=be.getSymbolTotalCodewords(t),o=qe.getTotalCodewordsCount(t,n),a=r-o,i=qe.getBlocksCount(t,n),s=r%i,c=i-s,l=Math.floor(r/i),u=Math.floor(a/i),d=u+1,p=l-u,y=new ci(p);let k=0;const w=new Array(i),v=new Array(i);let g=0;const M=new Uint8Array(e.buffer);for(let E=0;E<i;E++){const L=E<c?u:d;w[E]=M.slice(k,k+L),v[E]=y.encode(w[E]),k+=L,g=Math.max(g,L)}const m=new Uint8Array(r);let b=0,C,x;for(C=0;C<g;C++)for(x=0;x<i;x++)C<w[x].length&&(m[b++]=w[x][C]);for(C=0;C<p;C++)for(x=0;x<i;x++)m[b++]=v[x][C];return m}function ki(e,t,n,r){let o;if(Array.isArray(e))o=$e.fromArray(e);else if(typeof e=="string"){let l=t;if(!l){const u=$e.rawSplit(e);l=ye.getBestVersionForData(u,n)}o=$e.fromString(e,l||40)}else throw new Error("Invalid data");const a=ye.getBestVersionForData(o,n);if(!a)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=a;else if(t<a)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+a+`.
`);const i=mi(t,n,o),s=be.getSymbolSize(t),c=new ai(s);return hi(c,t),di(c),fi(c,t),Be(c,n,0),t>=7&&pi(c,t),yi(c,i),isNaN(r)&&(r=Oe.getBestMask(c,Be.bind(null,c,n))),Oe.applyMask(r,c),Be(c,n,r),{modules:c,version:t,errorCorrectionLevel:n,maskPattern:r,segments:o}}qt.create=function(t,n){if(typeof t>"u"||t==="")throw new Error("No input text");let r=Ae.M,o,a;return typeof n<"u"&&(r=Ae.from(n.errorCorrectionLevel,Ae.M),o=ye.from(n.version),a=Oe.from(n.maskPattern),n.toSJISFunc&&be.setToSJISFunction(n.toSJISFunc)),ki(t,o,r,a)};var on={},at={};(function(e){function t(n){if(typeof n=="number"&&(n=n.toString()),typeof n!="string")throw new Error("Color should be defined as hex string");let r=n.slice().replace("#","").split("");if(r.length<3||r.length===5||r.length>8)throw new Error("Invalid hex color: "+n);(r.length===3||r.length===4)&&(r=Array.prototype.concat.apply([],r.map(function(a){return[a,a]}))),r.length===6&&r.push("F","F");const o=parseInt(r.join(""),16);return{r:o>>24&255,g:o>>16&255,b:o>>8&255,a:o&255,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(r){r||(r={}),r.color||(r.color={});const o=typeof r.margin>"u"||r.margin===null||r.margin<0?4:r.margin,a=r.width&&r.width>=21?r.width:void 0,i=r.scale||4;return{width:a,scale:a?4:i,margin:o,color:{dark:t(r.color.dark||"#000000ff"),light:t(r.color.light||"#ffffffff")},type:r.type,rendererOpts:r.rendererOpts||{}}},e.getScale=function(r,o){return o.width&&o.width>=r+o.margin*2?o.width/(r+o.margin*2):o.scale},e.getImageWidth=function(r,o){const a=e.getScale(r,o);return Math.floor((r+o.margin*2)*a)},e.qrToImageData=function(r,o,a){const i=o.modules.size,s=o.modules.data,c=e.getScale(i,a),l=Math.floor((i+a.margin*2)*c),u=a.margin*c,d=[a.color.light,a.color.dark];for(let p=0;p<l;p++)for(let y=0;y<l;y++){let k=(p*l+y)*4,w=a.color.light;if(p>=u&&y>=u&&p<l-u&&y<l-u){const v=Math.floor((p-u)/c),g=Math.floor((y-u)/c);w=d[s[v*i+g]?1:0]}r[k++]=w.r,r[k++]=w.g,r[k++]=w.b,r[k]=w.a}}})(at);(function(e){const t=at;function n(o,a,i){o.clearRect(0,0,a.width,a.height),a.style||(a.style={}),a.height=i,a.width=i,a.style.height=i+"px",a.style.width=i+"px"}function r(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(a,i,s){let c=s,l=i;typeof c>"u"&&(!i||!i.getContext)&&(c=i,i=void 0),i||(l=r()),c=t.getOptions(c);const u=t.getImageWidth(a.modules.size,c),d=l.getContext("2d"),p=d.createImageData(u,u);return t.qrToImageData(p.data,a,c),n(d,l,u),d.putImageData(p,0,0),l},e.renderToDataURL=function(a,i,s){let c=s;typeof c>"u"&&(!i||!i.getContext)&&(c=i,i=void 0),c||(c={});const l=e.render(a,i,c),u=c.type||"image/png",d=c.rendererOpts||{};return l.toDataURL(u,d.quality)}})(on);var an={};const wi=at;function Et(e,t){const n=e.a/255,r=t+'="'+e.hex+'"';return n<1?r+" "+t+'-opacity="'+n.toFixed(2).slice(1)+'"':r}function Ie(e,t,n){let r=e+t;return typeof n<"u"&&(r+=" "+n),r}function vi(e,t,n){let r="",o=0,a=!1,i=0;for(let s=0;s<e.length;s++){const c=Math.floor(s%t),l=Math.floor(s/t);!c&&!a&&(a=!0),e[s]?(i++,s>0&&c>0&&e[s-1]||(r+=a?Ie("M",c+n,.5+l+n):Ie("m",o,0),o=0,a=!1),c+1<t&&e[s+1]||(r+=Ie("h",i),i=0)):o++}return r}an.render=function(t,n,r){const o=wi.getOptions(n),a=t.modules.size,i=t.modules.data,s=a+o.margin*2,c=o.color.light.a?"<path "+Et(o.color.light,"fill")+' d="M0 0h'+s+"v"+s+'H0z"/>':"",l="<path "+Et(o.color.dark,"stroke")+' d="'+vi(i,a,o.margin)+'"/>',u='viewBox="0 0 '+s+" "+s+'"',p='<svg xmlns="http://www.w3.org/2000/svg" '+(o.width?'width="'+o.width+'" height="'+o.width+'" ':"")+u+' shape-rendering="crispEdges">'+c+l+`</svg>
`;return typeof r=="function"&&r(null,p),p};const Mi=T1,We=qt,sn=on,bi=an;function it(e,t,n,r,o){const a=[].slice.call(arguments,1),i=a.length,s=typeof a[i-1]=="function";if(!s&&!Mi())throw new Error("Callback required as last argument");if(s){if(i<2)throw new Error("Too few arguments provided");i===2?(o=n,n=t,t=r=void 0):i===3&&(t.getContext&&typeof o>"u"?(o=r,r=void 0):(o=r,r=n,n=t,t=void 0))}else{if(i<1)throw new Error("Too few arguments provided");return i===1?(n=t,t=r=void 0):i===2&&!t.getContext&&(r=n,n=t,t=void 0),new Promise(function(c,l){try{const u=We.create(n,r);c(e(u,t,r))}catch(u){l(u)}})}try{const c=We.create(n,r);o(null,e(c,t,r))}catch(c){o(c)}}ke.create=We.create;ke.toCanvas=it.bind(null,sn.render);ke.toDataURL=it.bind(null,sn.renderToDataURL);ke.toString=it.bind(null,function(e,t,n){return bi.render(e,n)});export{Zi as $,ts as A,el as B,Qi as C,Cs as D,us as E,Bs as F,js as G,Os as H,Ys as I,as as J,Ic as K,Zs as L,hc as M,nl as N,Ht as O,gc as P,Rc as Q,_c as R,Gc as S,tl as T,Vc as U,As as V,Ci as W,ul as X,es as Y,ac as Z,$i as _,xi as a,Ti as a$,ec as a0,H as a1,ks as a2,al as a3,Zc as a4,Is as a5,Ws as a6,kc as a7,mc as a8,Hi as a9,bs as aA,ws as aB,yc as aC,zs as aD,cc as aE,Bi as aF,sc as aG,Us as aH,pc as aI,Fs as aJ,ys as aK,Hs as aL,$s as aM,cl as aN,os as aO,Ei as aP,oc as aQ,Ts as aR,ke as aS,vs as aT,gs as aU,ds as aV,sl as aW,il as aX,Ps as aY,Oi as aZ,Vi as a_,zi as aa,Es as ab,Pi as ac,Nc as ad,Wi as ae,Xc as af,Ui as ag,qi as ah,Tc as ai,lc as aj,Mc as ak,cs as al,Hc as am,Li as an,Xn as ao,Ni as ap,Si as aq,Fi as ar,nc as as,hl as at,jc as au,tc as av,Js as aw,dc as ax,Oc as ay,Sc as az,Wc as b,Ec as b0,Qs as b1,ms as b2,ps as b3,ic as b4,Pc as b5,Gs as b6,wc as b7,ss as b8,is as b9,Ii as bA,dl as bB,Bc as ba,Ns as bb,Xs as bc,Ki as bd,ll as be,Cc as bf,qc as bg,fs as bh,Di as bi,Ss as bj,Ls as bk,bc as bl,rc as bm,hs as bn,ol as bo,rl as bp,ji as bq,rs as br,qs as bs,Uc as bt,Vs as bu,Ds as bv,Rs as bw,xs as bx,_s as by,Ji as bz,Ri as c,Gi as d,ls as e,zc as f,Lc as g,Kc as h,fc as i,Yc as j,Ks as k,Jc as l,Ms as m,Qc as n,Ai as o,Dc as p,$c as q,vc as r,uc as s,Xi as t,Ge as u,xc as v,Yi as w,Ac as x,Fc as y,ns as z};
