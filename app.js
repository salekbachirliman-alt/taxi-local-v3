(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const cfg = window.TAXI_LOCAL_CONFIG;
  let client = null;
  let currentPosition = null;
  let currentUser = null;
  let currentProfile = null;
  let refreshTimer = null;

  function toast(message, error = false) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add("hidden"), 5000);
  }
  function showScreen(id) {
    $(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    $(".bottom-nav .nav-item").forEach(item => {
      const active = item.dataset.screen === id;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    window.scrollTo({top:0, behavior:"smooth"});
  }
  function friendlyError(error) {
    const msg = error?.message || "Ha ocurrido un error inesperado.";
    if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
    if (/Email not confirmed/i.test(msg)) return "Confirma tu correo electrónico y vuelve a entrar.";
    if (/row-level security|permission denied/i.test(msg)) return "Supabase ha bloqueado esta operación por permisos. Revisa las políticas RLS.";
    return msg;
  }
  function ensureClient() {
    if (client) return client;
    if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY || !window.supabase?.createClient) {
      throw new Error("Falta la configuración de Supabase. Comprueba config.js.");
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return client;
  }
  function safeText(value) {
    const span = document.createElement("span");
    span.textContent = value == null ? "" : String(value);
    return span.innerHTML;
  }
  $$("[data-screen]").forEach(b => b.addEventListener("click", () => showScreen(b.dataset.screen)));
  $$(".tab[data-tab]").forEach(b => b.addEventListener("click", () => {
    $$(".tab[data-tab]").forEach(t => t.classList.toggle("active", t === b));
    $("#login-form").classList.toggle("hidden", b.dataset.tab !== "login");
    $("#register-form").classList.toggle("hidden", b.dataset.tab !== "register");
  }));

  $("#locate-button").addEventListener("click", () => {
    const status = $("#location-status");
    if (!navigator.geolocation) { status.textContent = "Este navegador no permite GPS. Escribe la dirección manualmente."; return; }
    status.textContent = "Solicitando ubicación…";
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = {lat:pos.coords.latitude, lng:pos.coords.longitude};
      $("#pickup").value = "Mi ubicación actual";
      status.textContent = "Ubicación obtenida.";
    }, () => { status.textContent = "No se pudo obtener el GPS. Puedes escribir la dirección manualmente."; }, {enableHighAccuracy:true, timeout:12000, maximumAge:30000});
  });

  $("#request-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const db = ensureClient();
      const pickup = $("#pickup").value.trim();
      const phone = $("#customer-phone").value.trim();
      if (!pickup || !phone) throw new Error("Escribe tu teléfono y el punto de recogida.");
      const {data, error} = await db.rpc("create_public_ride", {
        p_town: $("#city").value,
        p_pickup_address: pickup,
        p_destination_address: $("#destination").value.trim() || null,
        p_pickup_lat: currentPosition?.lat ?? null,
        p_pickup_lng: currentPosition?.lng ?? null,
        p_passengers: Number($("#passengers").value),
        p_rider_phone: phone,
        p_notes: $("#ride-notes").value.trim() || null
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.ride_id || !result?.public_access_token) throw new Error("La solicitud se ha enviado, pero no se recibió el código de seguimiento.");
      $("#ride-result").innerHTML = "<h3>Solicitud enviada</h3><p>Tu número de solicitud:</p><strong>" + safeText(result.ride_id) + "</strong><p>Guarda este código para consultar la reserva. Un conductor podrá aceptarla si está disponible.</p>";
      $("#ride-result").classList.remove("hidden");
      toast("Solicitud de taxi enviada.");
      $("#request-form").reset();
      currentPosition = null;
      $("#location-status").textContent = "";
    } catch (e) { toast(friendlyError(e), true); }
    finally { button.disabled = false; }
  });

  $("#register-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const db = ensureClient();
      const password = $("#register-password").value;
      if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
      const {data, error} = await db.auth.signUp({
        email: $("#register-email").value.trim(),
        password,
        options: {data: {
          requested_role:"driver",
          full_name:$("#register-name").value.trim(),
          phone:$("#register-phone").value.trim(),
          town:$("#register-town").value
        }}
      });
      if (error) throw error;
      if (!data.session) {
        toast("Cuenta creada. Revisa el correo para confirmar la cuenta; después el administrador debe aprobar el conductor.");
      } else {
        await loadSession();
        toast("Cuenta creada. El administrador debe aprobar el conductor antes de trabajar.");
      }
    } catch (e) { toast(friendlyError(e), true); }
    finally { button.disabled = false; }
  });

  $("#login-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const db = ensureClient();
      const {error} = await db.auth.signInWithPassword({email:$("#login-email").value.trim(), password:$("#login-password").value});
      if (error) throw error;
      await loadSession();
      toast("Sesión iniciada.");
    } catch (e) { toast(friendlyError(e), true); }
    finally { button.disabled = false; }
  });

  async function loadSession() {
    const db = ensureClient();
    const {data:{user}, error} = await db.auth.getUser();
    if (error) throw error;
    currentUser = user;
    if (!user) { showAuth(); return; }
    const {data:profile, error:profileError} = await db.from("profiles").select("id,role,full_name,phone,town,is_verified").eq("id", user.id).single();
    if (profileError) throw profileError;
    currentProfile = profile;
    $("#auth-panel").classList.add("hidden");
    $("#driver-dashboard").classList.remove("hidden");
    $("#driver-name").textContent = profile.full_name || user.email || "Conductor";
    if (profile.role !== "driver") {
      $("#driver-status").textContent = "Esta cuenta no está registrada como conductor.";
      $("#driver-pending").textContent = "Cierra sesión y crea una cuenta de conductor para usar este panel.";
      $("#refresh-rides").classList.add("hidden");
    } else if (!profile.is_verified) {
      $("#driver-status").textContent = "Pendiente de aprobación";
      $("#driver-pending").textContent = "Tu cuenta todavía no está aprobada. El administrador debe verificarla antes de mostrarte solicitudes.";
      $("#refresh-rides").classList.add("hidden");
    } else {
      $("#driver-status").textContent = "Conductor aprobado · " + profile.town;
      $("#refresh-rides").classList.remove("hidden");
      await loadRides();
      clearInterval(refreshTimer);
      refreshTimer = setInterval(() => loadRides().catch(() => {}), 15000);
    }
    showScreen("driver-screen");
  }
  function showAuth() {
    currentUser = null; currentProfile = null;
    clearInterval(refreshTimer);
    $("#auth-panel").classList.remove("hidden");
    $("#driver-dashboard").classList.add("hidden");
  }
  async function loadRides() {
    if (!currentProfile || currentProfile.role !== "driver" || !currentProfile.is_verified) return;
    const db = ensureClient();
    const {data, error} = await db.rpc("list_pending_rides");
    if (error) throw error;
    const container = $("#driver-pending");
    if (!data?.length) { container.textContent = "No hay solicitudes pendientes en tu localidad."; return; }
    container.innerHTML = data.map(r => '<article class="ride-card"><h4>Solicitud ' + safeText(String(r.ride_id).slice(0,8)) + '</h4><p><b>Recogida:</b> ' + safeText(r.pickup_address) + '</p><p><b>Destino:</b> ' + safeText(r.destination_address || "No indicado") + '</p><p><b>Localidad:</b> ' + safeText(r.town) + ' · ' + safeText(r.passengers) + ' pasajero(s)</p><button class="primary-button accept-ride" data-id="' + safeText(r.ride_id) + '">Aceptar solicitud</button></article>').join("");
    $$(".accept-ride").forEach(b => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const {data:accepted, error:acceptError} = await db.rpc("accept_ride", {p_ride_id:b.dataset.id});
        if (acceptError) throw acceptError;
        if (!accepted) throw new Error("Otro conductor ya ha aceptado esta solicitud.");
        toast("Solicitud aceptada. Los datos de contacto se mostrarán en tus viajes asignados.");
        await loadRides();
      } catch (e) { toast(friendlyError(e), true); b.disabled = false; }
    }));
  }
  $("#refresh-rides").addEventListener("click", () => loadRides().then(() => toast("Solicitudes actualizadas.")).catch(e => toast(friendlyError(e), true)));
  $("#logout-button").addEventListener("click", async () => {
    try { const {error} = await ensureClient().auth.signOut(); if (error) throw error; showAuth(); showScreen("home-screen"); toast("Sesión cerrada."); }
    catch (e) { toast(friendlyError(e), true); }
  });
  ensureClientSafe();
  function ensureClientSafe() {
    try { ensureClient(); }
    catch (e) { toast(e.message, true); }
  }
  ensureClientSafe();
  if (window.supabase?.createClient && cfg?.SUPABASE_URL && cfg?.SUPABASE_ANON_KEY) {
    ensureClient().auth.getSession().then(({data}) => { if (data.session) loadSession().catch(e => toast(friendlyError(e), true)); });
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();