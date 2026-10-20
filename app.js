(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let currentPosition = null;
  let currentScreen = "home-screen";

  function toast(message, error = false) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add("hidden"), 4200);
  }
  function showScreen(id) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    currentScreen = id;
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.screen === id || (id === "driver-dashboard" && b.dataset.screen === "driver-screen")));
    window.scrollTo({top:0, behavior:"smooth"});
  }
  $$("[data-screen]").forEach(button => button.addEventListener("click", () => showScreen(button.dataset.screen)));
  $$(".tabs .tab[data-tab]").forEach(button => button.addEventListener("click", () => {
    $$(".tabs .tab[data-tab]").forEach(b => b.classList.toggle("active", b === button));
    $("#login-form").classList.toggle("hidden", button.dataset.tab !== "login");
    $("#register-form").classList.toggle("hidden", button.dataset.tab !== "register");
  }));
  $$(".dashboard-tabs .tab").forEach(button => button.addEventListener("click", () => {
    $$(".dashboard-tabs .tab").forEach(b => b.classList.toggle("active", b === button));
    ["map","agenda","profile"].forEach(name => $("#dash-" + name).classList.toggle("hidden", name !== button.dataset.dash));
  }));

  $("#locate-button").addEventListener("click", () => {
    const status = $("#location-status");
    if (!navigator.geolocation) {
      status.textContent = "Este navegador no permite compartir ubicación. Escribe la dirección manualmente.";
      return;
    }
    status.textContent = "Esperando permiso de ubicación…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        currentPosition = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        status.textContent = "Ubicación obtenida. La solicitud podrá incluir tu punto de recogida.";
        $("#pickup").value = `Ubicación GPS (${currentPosition.latitude.toFixed(5)}, ${currentPosition.longitude.toFixed(5)})`;
      },
      err => {
        status.textContent = err.code === 1 ? "No se concedió el permiso. Puedes escribir la dirección manualmente." : "No se pudo obtener la ubicación. Comprueba el permiso o escribe la dirección.";
      },
      { enableHighAccuracy:true, timeout:12000, maximumAge:30000 }
    );
  });

  $("#request-form").addEventListener("submit", event => {
    event.preventDefault();
    const pickup = $("#pickup").value.trim();
    if (!currentPosition && !pickup) {
      toast("Comparte tu ubicación o escribe el punto de recogida.", true);
      return;
    }
    const request = {
      phone: $("#customer-phone").value.trim(),
      city: $("#city").value,
      pickup,
      destination: $("#destination").value.trim(),
      location: currentPosition
    };
    // No se envía a ningún servidor hasta configurar y probar el backend.
    sessionStorage.setItem("taxiLocalDraftRequest", JSON.stringify(request));
    toast("Formulario validado. Falta conectar Supabase para publicar la solicitud.");
  });

  $("#register-form").addEventListener("submit", event => {
    event.preventDefault();
    const password = $("#register-password").value;
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      toast("La contraseña debe tener 8 caracteres, una mayúscula, un número y un símbolo.", true);
      return;
    }
    toast("Formulario válido. La creación real de la cuenta requiere configurar Supabase.");
  });
  $("#login-form").addEventListener("submit", event => {
    event.preventDefault();
    toast("El inicio de sesión estará disponible al conectar Supabase.");
  });
  $("#admin-form").addEventListener("submit", event => {
    event.preventDefault();
    toast("Acceso administrativo aún no conectado. No se ha iniciado sesión.");
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();