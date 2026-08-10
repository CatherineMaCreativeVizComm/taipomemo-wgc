<svelte:options customElement={{ tag: "taipomemo-wgc", shadow: "open" }} />

<script>
  import { onMount } from "svelte";
  export let jsonUrl =
    "https://multimedia.scmp.com/infographics/news/hong-kong/article/3356650/taipo_fire_memorial/data/namelist.json";

  const TOTAL_DIVS = 168;
  
  let containerWidth = 0;
  let containerHeight = 0;
  let windowWidth = 0;
  let windowHeight = 0;

  let fogCanvas;
  let fogCtx;

  let isMobile = false;
  $: isMobile = containerWidth < 600;
  
  $: collisionRadius = isMobile ? 60 : 50; 
  $: minDist = collisionRadius * 2;
  
  const FADE_ZONE_HEIGHT = 180; 
  const FADE_IN_ZONE_BOTTOM = 180;     

  let items = [];
  let loading = true;
  let errorMsg = null;
  let initialized = false;

  const isDev =
    typeof import.meta.env !== "undefined"
      ? import.meta.env.DEV
      : process.env.NODE_ENV === "development";

  const targetUrl = isDev
    ? jsonUrl.replace("https://multimedia.scmp.com", "/api/multimedia")
    : jsonUrl;

  onMount(() => {
    let frameId;
    let sortedData = [];
    let smokeParticles = [];
    
    const SMOKE_PARTICLE_COUNT = isMobile ? 50 : 100; 

    function createSmokeParticle(initialSpawn = false) {
      const h = windowHeight ? windowHeight + 100 : 900;
      const w = windowWidth ? windowWidth + 100 : 1300;
      
      let startX = Math.random() * w - 50;
      let startY = Math.random() * h - 50;

      if (!initialSpawn) {
        if (Math.random() > 0.5) {
          startX = Math.random() > 0.5 ? -150 : w + 150;
        } else {
          startY = Math.random() > 0.5 ? -150 : h + 150;
        }
      }

      return {
        x: startX,
        y: startY,
        size: (Math.random() * (isMobile ? 20 : 40)) + (isMobile ? 60 : 120), 
        speedY: (Math.random() - 0.5) * 0.8, 
        driftX: (Math.random() - 0.5) * 1.5, 
        opacity: 0,
        expandRate: (Math.random() - 0.5) * 0.2, 
        growth: 1
      };
    }

    function resetSmokeParticles() {
      if (windowWidth === 0 || windowHeight === 0) return;
      smokeParticles = [];
      if (fogCanvas) {
        fogCanvas.width = windowWidth + 100;
        fogCanvas.height = windowHeight + 100;
      }
      for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
        smokeParticles.push(createSmokeParticle(true));
      }
    }

    async function loadData() {
      try {
        const response = await fetch(targetUrl);
        if (!response.ok)
          throw new Error(`Failed to fetch data (${response.status})`);

        const rawData = await response.json();
        const dataArray = Array.isArray(rawData)
          ? rawData
          : rawData.record || [];
        
        sortedData = [...dataArray].sort((a, b) =>
          (a.eng_name || "").localeCompare(b.eng_name || ""),
        );

        loading = false;

        if (containerWidth > 0 && containerHeight > 0) {
          initializeAnimationLayers();
        }
      } catch (err) {
        errorMsg = err.message;
        loading = false;
      }
    }

    function initializeAnimationLayers() {
      if (initialized) return;

      if (fogCanvas) {
        fogCtx = fogCanvas.getContext("2d");
        resetSmokeParticles();
      }

      initializePositions();
      initialized = true;
      frameId = requestAnimationFrame(updateAndDrawAllLayers);
    }

    function initializePositions() {
      let tempItems = [];
      const stepY = isMobile ? 26 : 18;

      for (let i = 0; i < TOTAL_DIVS; i++) {
        const record = sortedData[i] || {
          eng_name: `Position ${i + 1}`,
          ch_name: "",
        };

        const startX = Math.random() * (containerWidth - collisionRadius * 4) + (collisionRadius * 2);
        const startY = (containerHeight * 0.15) + (i * stepY); 

        tempItems.push({
          id: i,
          eng_name: record.eng_name,
          ch_name: record.ch_name,
          x: startX,
          y: startY,
          vx: isMobile ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.2, 
          vy: isMobile ? -(Math.random() * 0.2 + 0.4) : -(Math.random() * 0.15 + 0.35) * 0.5, 
          rotation: Math.random() * 360,
          transform: "",
          opacity: 1, 
        });
      }

      items = tempItems;
    }

    function updateAndDrawAllLayers(timeStamp) {
      if (fogCtx && windowWidth > 0 && windowHeight > 0) {
        const canvasW = windowWidth + 100;
        const canvasH = windowHeight + 100;
        fogCtx.clearRect(0, 0, canvasW, canvasH);

        for (let i = 0; i < smokeParticles.length; i++) {
          let p = smokeParticles[i];
          p.x += p.driftX;
          p.y += p.speedY;
          p.growth += p.expandRate;
          
          let currentRadius = p.size + p.growth;
          if (currentRadius < 10) currentRadius = 10; 

          fogCtx.globalAlpha = p.opacity;
          fogCtx.fillStyle = "#ffffff"; 
          fogCtx.beginPath();
          fogCtx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          fogCtx.fill();
          
          if (p.x < -currentRadius) p.x = canvasW + currentRadius;
          if (p.x > canvasW + currentRadius) p.x = -currentRadius;
          if (p.y < -currentRadius) p.y = canvasH + currentRadius;
          if (p.y > canvasH + currentRadius) p.y = -currentRadius;
        }
        fogCtx.globalAlpha = 1; 
      }

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i];
          const itemB = items[j];

          if (itemA.y > containerHeight + 50 || itemB.y > containerHeight + 50) continue;
          if (itemA.opacity <= 0 || itemB.opacity <= 0) continue;

          const dx = itemB.x - itemA.x;
          const dy = itemB.y - itemA.y;
          const distance = Math.hypot(dx, dy);

          if (distance < minDist) {
            const overlap = minDist - distance;
            const force = isMobile ? overlap * 0.03 : overlap * 0.05; 
            
            const nx = (dx / (distance || 1)) * force;
            const ny = (dy / (distance || 1)) * force;

            itemA.x -= nx;
            itemA.y -= ny;
            itemB.x += nx;
            itemB.y += ny;
          }
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.x += item.vx;
        item.y += item.vy;

        if (item.x < collisionRadius) {
          item.x = collisionRadius;
          item.vx *= -1;
        } else if (item.x > containerWidth - collisionRadius) {
          item.x = containerWidth - collisionRadius;
          item.vx *= -1;
        }

        if (item.y < -60) {
          item.y = containerHeight + 40; 
          item.x = Math.random() * (containerWidth - collisionRadius * 4) + (collisionRadius * 2);
        }

        let calculatedOpacity = 1;

        if (item.y < FADE_ZONE_HEIGHT) {
          calculatedOpacity = Math.max(0, item.y / FADE_ZONE_HEIGHT);
        }
        else if (item.y > containerHeight - FADE_IN_ZONE_BOTTOM) {
          const distanceFromBottom = containerHeight - item.y;
          calculatedOpacity = Math.max(0, distanceFromBottom / FADE_IN_ZONE_BOTTOM);
        }

        item.opacity = calculatedOpacity;
        item.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      }

      items = items;
      frameId = requestAnimationFrame(updateAndDrawAllLayers);
    }

    const checkDimensions = setInterval(() => {
      if (containerWidth > 0 && containerHeight > 0 && windowWidth > 0 && windowHeight > 0) {
        if (!initialized && sortedData.length > 0) {
          initializeAnimationLayers();
          clearInterval(checkDimensions);
        } else if (initialized && fogCanvas) {
          if (fogCanvas.width !== windowWidth + 100 || fogCanvas.height !== windowHeight + 100) {
             resetSmokeParticles(); 
          }
        }
      }
    }, 50);

    loadData();

    return () => {
      clearInterval(checkDimensions);
      if (frameId) cancelAnimationFrame(frameId);
    };
  });
</script>

<section class="flowerCtn" bind:clientWidth={windowWidth} bind:clientHeight={windowHeight}>
  
  <div class="canvasMask">
    <canvas bind:this={fogCanvas} class="fogCanvas"></canvas>
  </div>
  <div class="fogVignette"></div>

  <div class="petalScrollLayer">
    <div class="petalContentTrack" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
      {#if loading}
        <div class="statusMsg">Loading Source Data...</div>
      {:else if errorMsg}
        <div class="statusMsg error">Error: {errorMsg}</div>
      {:else}
        {#each items as item (item.id)}
          <div class="flowerWrapper" style="transform: {item.transform}; opacity: {item.opacity}; z-index: 10;">
            <div
              class="petal"
              style="transform: translate(-50%, -50%) rotate({item.rotation}deg);"
            ></div>
            <div class="nameCtn">
              <div class="eng">{item.eng_name}</div>
              <div class="ch">{item.ch_name}</div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

</section>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: "Barlow Semi Condensed", sans-serif;
  }

  .flowerCtn {
    position: relative;
    /* background-color: #4a4644;  */
    overflow: hidden;
    width: 100%;
    height: 300vh;
  }

  .petalScrollLayer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    z-index: 5;
  }

  .petalContentTrack {
    position: relative;
    width: 100%;
    max-width: 1000px; 
    margin: 0 auto;   
    height: 300vh;   
  }

  .canvasMask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
  }

  .fogCanvas {
    position: absolute;
    top: -50px;
    left: -50px;
    width: calc(100% + 100px);
    height: calc(100% + 100px);
    pointer-events: none;
    opacity: 0; 
    filter: blur(30px); 
  }

  .fogVignette {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    /* box-shadow: inset 0 0 60px 40px #4a4644; */
    /* mix-blend-mode: multiply; */
  }

  .statusMsg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: sans-serif;
    color: #64748b;
    font-size: 16px;
    z-index: 20;
  }

  .statusMsg.error {
    color: #ef4444;
  }

  .flowerWrapper {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    will-change: transform, opacity;
    pointer-events: none;
  }

  .petal {
    position: absolute;
    top: 0;
    left: 0;
    width: 80px;
    height: 80px;
    opacity: 0.6;
    will-change: transform;
    pointer-events: none;
    background-image: url("https://multimedia.scmp.com/infographics/news/hong-kong/article/3356650/taipo_fire_memorial/images/petal.png");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  .nameCtn {
    position: absolute;
    left: calc(50% - 30px);
    top: 0;
    transform: translateY(-60px);
    width: fit-content;
    text-wrap: nowrap;
    font-size: 14px;
    /* opacity: 0; */
  }

  .nameCtn .eng, .nameCtn .ch {
    font-weight: 300;
    color: #fff;
    text-align: center;
    text-shadow: 0px 1px 4px rgba(0, 0, 0, 0.8); 
  }

  @media (max-width: 600px) {
    .petal {
      width: 50px;
      height: 50px;
    }
    .nameCtn {
      left: calc(50% - 20px);
      font-size: 11px;
    }
    .flowerCtn {
      height: 320vh;
    }
    .petalScrollLayer {
      left: 1%;
      width: 98%;
    }

  }
</style>