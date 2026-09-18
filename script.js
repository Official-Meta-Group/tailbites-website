/* =========================================================
   TAILBITE'S — script.js
========================================================= */

(function () {
    "use strict";

    /* ============================ HELPERS ============================ */

    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ============================ HEADER / PROGRESS ============================ */

    const header = $("#siteHeader");
    const progress = $("#scrollProgress");
    const toTop = $("#toTop");

    function onScroll() {
        const y = window.scrollY;

        header.classList.toggle("sticky", y > 40);
        toTop.classList.toggle("show", y > 700);

        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

        setActiveNavLink(y);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    toTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    /* ============================ ACTIVE NAV LINK ============================ */

    var navLinks = $$(".desktop-nav a");
    var sections = navLinks
        .map((a) => $(a.getAttribute("href")))
        .filter(Boolean);

    function setActiveNavLink(y) {
        let currentIndex = -1;

        sections.forEach((section, i) => {
            if (section.offsetTop - 140 <= y) currentIndex = i;
        });

        navLinks.forEach((a, i) => a.classList.toggle("active", i === currentIndex));
    }

    onScroll();

    /* ============================ MOBILE MENU ============================ */

    const burger = $("#burger");
    const mobileMenu = $("#mobileMenu");
    const backdrop = $("#menuBackdrop");

    function setMenu(open) {
        burger.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "Sulge menüü" : "Ava menüü");
        mobileMenu.classList.toggle("open", open);
        mobileMenu.inert = !open;
        backdrop.classList.toggle("show", open);
        document.body.classList.toggle("no-scroll", open);
    }

    burger.addEventListener("click", () => setMenu(!mobileMenu.classList.contains("open")));
    backdrop.addEventListener("click", () => setMenu(false));
    $$("#mobileMenu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setMenu(false);
    });

    /* ============================ ORDER LOCATION DIALOG ============================ */

    const orderDialog = $("#orderDialog");
    const orderClose = $(".order-close", orderDialog);
    let orderReturnFocus = null;
    let orderScrollY = 0;
    let orderScrollX = 0;
    let orderBodyStyles = null;

    function openOrderDialog(trigger) {
        if (orderDialog.open) return;
        // The mobile trigger becomes hidden when its menu closes.
        orderReturnFocus = mobileMenu.contains(trigger) ? burger : trigger;
        setMenu(false);
        orderScrollY = window.scrollY;
        orderScrollX = window.scrollX;
        const bodyStyle = document.body.style;
        const properties = ["position", "top", "left", "width", "overflow", "padding-right"];
        orderBodyStyles = properties.map((name) => [name, bodyStyle.getPropertyValue(name), bodyStyle.getPropertyPriority(name)]);
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const paddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
        bodyStyle.position = "fixed";
        bodyStyle.top = `-${orderScrollY}px`;
        bodyStyle.left = `-${orderScrollX}px`;
        bodyStyle.width = "100%";
        bodyStyle.overflow = "hidden";
        bodyStyle.paddingRight = `${paddingRight + scrollbarWidth}px`;
        // Native modal semantics make the rest of the page inert and contain focus.
        orderDialog.showModal();
        orderClose.focus({ preventScroll: true });
    }

    function closeOrderDialog() {
        if (orderDialog.open) orderDialog.close();
    }

    // Delegation also covers menu cards recreated by category filtering.
    document.addEventListener("click", (event) => {
        const trigger = event.target.closest(".order-trigger");
        if (!trigger) return;
        event.preventDefault();
        openOrderDialog(trigger);
    });

    orderClose.addEventListener("click", closeOrderDialog);
    orderDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeOrderDialog();
    });

    let orderPointerOnBackdrop = false;
    orderDialog.addEventListener("pointerdown", (event) => {
        orderPointerOnBackdrop = event.target === orderDialog;
    });
    orderDialog.addEventListener("click", (event) => {
        if (event.target === orderDialog && orderPointerOnBackdrop) closeOrderDialog();
        orderPointerOnBackdrop = false;
    });

    orderDialog.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;
        const focusable = $$("button, a[href]", orderDialog);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    orderDialog.addEventListener("close", () => {
        if (!orderBodyStyles) return;
        orderBodyStyles.forEach(([name, value, priority]) => {
            if (value) document.body.style.setProperty(name, value, priority);
            else document.body.style.removeProperty(name);
        });
        orderBodyStyles = null;
        const rootStyle = document.documentElement.style;
        const scrollBehavior = rootStyle.getPropertyValue("scroll-behavior");
        const scrollPriority = rootStyle.getPropertyPriority("scroll-behavior");
        rootStyle.setProperty("scroll-behavior", "auto", "important");
        window.scrollTo(orderScrollX, orderScrollY);
        if (scrollBehavior) rootStyle.setProperty("scroll-behavior", scrollBehavior, scrollPriority);
        else rootStyle.removeProperty("scroll-behavior");
        if (orderReturnFocus && orderReturnFocus.isConnected) orderReturnFocus.focus({ preventScroll: true });
        orderReturnFocus = null;
    });

    // Returning from the ordering site should show the page with no active chooser.
    $$(".order-city", orderDialog).forEach((link) => link.addEventListener("click", closeOrderDialog));

    /* ============================ REVEAL ON SCROLL ============================ */

    const revealItems = $$(".reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach((el) => el.classList.add("visible"));
    } else {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, i) => {
                    if (!entry.isIntersecting) return;
                    setTimeout(() => entry.target.classList.add("visible"), i * 70);
                    io.unobserve(entry.target);
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
        );

        revealItems.forEach((el) => io.observe(el));
    }

    /* ============================ HERO COUNTERS ============================ */

    const counters = $$("[data-count]");

    function runCounter(el) {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const decimals = parseInt(el.dataset.decimal || "0", 10);
        const duration = 1500;
        const start = performance.now();

        function frame(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            let value = target * eased;

            if (decimals > 0) value = value / Math.pow(10, decimals);

            el.textContent = value.toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(frame);
        }

        if (reduceMotion) {
            const finalValue = decimals > 0 ? target / Math.pow(10, decimals) : target;
            el.textContent = finalValue.toFixed(decimals) + suffix;
            return;
        }

        requestAnimationFrame(frame);
    }

    if ("IntersectionObserver" in window) {
        const co = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    runCounter(entry.target);
                    co.unobserve(entry.target);
                });
            },
            { threshold: 0.6 }
        );
        counters.forEach((el) => co.observe(el));
    } else {
        counters.forEach(runCounter);
    }


    /* ============================ HERO PROMO ============================ */

    const promoTrack = $(".hero-promo-track");
    const promoSlides = $$(".hero-promo-slide");
    const promoDots = $$(".hero-promo-dots button");
    let promoIndex = 0;
    let promoTimer = null;

    function showPromo(index, restart) {
        if (!promoTrack || !promoDots.length) return;
        promoIndex = (index + promoDots.length) % promoDots.length;
        promoSlides.forEach((slide, i) => slide.classList.toggle("is-active", i === promoIndex));
        promoDots.forEach((dot, i) => dot.classList.toggle("is-active", i === promoIndex));
        if (restart) startPromo();
    }

    function startPromo() {
        clearInterval(promoTimer);
        if (!reduceMotion && promoDots.length > 1) promoTimer = setInterval(() => showPromo(promoIndex + 1, false), 5200);
    }

    promoDots.forEach((dot, i) => dot.addEventListener("click", () => showPromo(i, true)));
    showPromo(0, false);
    startPromo();

    /* ============================ MENU DATA + FILTERING ============================ */

    const MENU_ITEMS = [
        { cat: "promo", image: "assets/products/Tacos/TailbitesTaco.png", tag: "", name: "Tailbite\u2019s tacod", desc: "6 hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "11,90 \u20ac" },
        { cat: "promo", image: "assets/products/Tacos/CajunTaco.png", tag: "V\u00fcrtsikas", name: "Louisiana Cajun tacod", desc: "6 v\u00fcrtsikat hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "12,90 \u20ac" },
        { cat: "promo", image: "assets/products/Tacos/CoconutTaco.png", tag: "", name: "Hawaii Coconut tacod", desc: "6 kookose-laimi hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "11,90 \u20ac" },
        { cat: "promo", image: "assets/products/Sides/Churros.png", tag: "Magus", name: "Churrod", desc: "Kastmega: \u0161okolaad, karamell v\u00f5i maasikas.", price: "6,90 \u20ac" },

        { cat: "buckets", image: "assets/products/Shrimps/ClassicCrisp.png", tag: "", name: "Classic Crispy", desc: "Paneeritud krevetid. 8 / 12 / 20 / 30 tk.", price: "al. 8,90 \u20ac" },
        { cat: "buckets", image: "assets/products/Shrimps/HandmadeCrispyL.png", tag: "Best seller", name: "Handmade Crispy", desc: "V\u00e4rskelt k\u00e4sit\u00f6\u00f6na paneeritud hiidkrevetid. 8 / 12 / 20 / 30 tk.", price: "al. 11,90 \u20ac" },
        { cat: "buckets", image: "assets/products/Shrimps/CajunShrimps.png", tag: "V\u00fcrtsikas", name: "Louisiana Cajun", desc: "V\u00fcrtsikas cajun-kastmes hiidkrevetid. 8 / 12 / 20 / 30 tk.", price: "al. 10,90 \u20ac" },
        { cat: "buckets", image: "assets/products/Shrimps/CoconutShrimps.png", tag: "", name: "Hawaii Coconut", desc: "Kookose-laimikastmes hiidkrevetid. 8 / 12 / 20 / 30 tk.", price: "al. 10,90 \u20ac" },
        { cat: "buckets", image: "assets/products/Shrimps/TeriyakiShrimps.png", tag: "", name: "Tokyo Teriyaki", desc: "Magusas umamikastmes hiidkrevetid. 8 / 12 / 20 / 30 tk.", price: "al. 10,90 \u20ac" },
        { cat: "buckets", image: "assets/products/Shrimps/GarlicChillyShrimps.png", tag: "V\u00fcrtsikas", name: "Madrid Chilli & Garlic", desc: "T\u0161illi ja k\u00fc\u00fcslauguga grillitud hiidkrevetid. 8 / 12 / 20 / 30 tk.", price: "al. 9,90 \u20ac" },

        { cat: "tacos", image: "assets/products/Tacos/TailbitesTaco.png", tag: "", name: "Tailbite\u2019s tacod", desc: "6 hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "11,90 \u20ac" },
        { cat: "tacos", image: "assets/products/Tacos/CajunTaco.png", tag: "V\u00fcrtsikas", name: "Louisiana Cajun tacod", desc: "6 v\u00fcrtsikat hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "12,90 \u20ac" },
        { cat: "tacos", image: "assets/products/Tacos/CoconutTaco.png", tag: "", name: "Hawaii Coconut tacod", desc: "6 kookose-laimi hiidkrevetti, frillis, mais, tomat, wakame, marineeritud sibul.", price: "11,90 \u20ac" },

        { cat: "burgers", image: "assets/products/Burgers/TastyBurger.png", tag: "", name: "Tasty Burger", desc: "3 paneeritud krevetti, frillis, tomat, marineeritud kurk ja sibul.", price: "8,90 \u20ac" },
        { cat: "burgers", image: "assets/products/Burgers/HandmadeCrispyBurger.png", tag: "Best seller", name: "Handmade Crispy Burger", desc: "4 k\u00e4sit\u00f6\u00f6na paneeritud hiidkrevetti, frillis, tomat, marineeritud kurk ja sibul.", price: "11,90 \u20ac" },
        { cat: "burgers", image: "assets/products/Burgers/CajunBurger.png", tag: "V\u00fcrtsikas", name: "Louisiana Cajun Burger", desc: "4 v\u00fcrtsikat hiidkrevetti, frillis, tomat, marineeritud kurk ja sibul.", price: "9,90 \u20ac" },
        { cat: "burgers", image: "assets/products/Burgers/CoconutBurger.png", tag: "", name: "Hawaii Coconut Burger", desc: "4 kookose-laimi hiidkrevetti, frillis, tomat, marineeritud kurk ja sibul.", price: "9,90 \u20ac" },

        { cat: "sides", image: "assets/products/Sides/Fries.png", tag: "", name: "Friikartulid", desc: "Kr\u00f5bedad friikad. M / L.", price: "3,10 \u20ac" },
        { cat: "sides", image: "assets/products/Sides/Chips.png", tag: "", name: "Krevetikr\u00f5psud", desc: "Krevetimaitselised tapiokikr\u00f5psud. 8 / 12 / 20 tk.", price: "al. 3,10 \u20ac" },
        { cat: "sides", image: "assets/products/Sides/Cheeseballs.png", tag: "V\u00fcrtsikas", name: "Cheese Bites", desc: "Cheddari-jalapeno juustupallid. 5 / 8 / 12 tk.", price: "al. 5,90 \u20ac" },
        { cat: "sides", image: "assets/products/Sides/Wakame.png", tag: "", name: "Wakame salat", desc: "Merevetikasalat kr\u00f5mpsu k\u00f5rvale.", price: "3,90 \u20ac" },
        { cat: "sides", image: "assets/products/Sides/Salat.png", tag: "", name: "V\u00e4rske salat", desc: "Frillis, tomat, marineeritud kurk, marineeritud sibul.", price: "3,90 \u20ac" },
        { cat: "sides", image: "assets/products/Sides/Churros.png", tag: "Magus", name: "Churrod", desc: "Kastmega: \u0161okolaad, karamell v\u00f5i maasikas.", price: "6,90 \u20ac" },

        { cat: "drinks", image: "assets/products/Drinks/Cola.png", tag: "", name: "Coca-Cola 0,25 l", desc: "Karastusjook Coca-Cola.", price: "2,80 \u20ac" },
        { cat: "drinks", image: "assets/products/Drinks/ColaZero.png", tag: "", name: "Coca-Cola Zero 0,25 l", desc: "Karastusjook Coca-Cola Zero.", price: "2,80 \u20ac" },
        { cat: "drinks", image: "assets/products/Drinks/Sprite.png", tag: "", name: "Sprite 0,25 l", desc: "Karastusjook Sprite.", price: "2,80 \u20ac" },
        { cat: "drinks", image: "assets/products/Drinks/Fanta.png", tag: "", name: "Fanta 0,25 l", desc: "Karastusjook Fanta", price: "2,80 \u20ac" },
        { cat: "drinks", image: "assets/products/Drinks/WaterBubbles.png", tag: "", name: "Mulliga Vesi 0,33 l", desc: "Gaasita vesi.", price: "2,20 \u20ac" },
        { cat: "drinks", image: "assets/products/Drinks/WaterStill.png", tag: "", name: "Vesi 0,33 l", desc: "Gaasiga v\u00f5i gaasita.", price: "2,20 \u20ac" },

        { cat: "sauces", image: "assets/products/Sauces/BiteSauce.png", tag: "Best seller", name: "Tailbite\u2019s Bite Sauce", desc: "Meie signatuurkaste, 90 ml.", price: "2,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/SrirachaMajo.png", tag: "V\u00fcrtsikas", name: "Sriracha majo", desc: "Kr\u00f5be krevett + sriracha majonees = idekas kombo. 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Kurgimajo.png", tag: "", name: "Kurgimajo", desc: "Mahe ja v\u00e4rskendav, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/SweetChilly.png", tag: "", name: "Magus-t\u0161illi", desc: "Magus ja kergelt terav, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Sriracha.png", tag: "", name: "Sriracha", desc: "Puhas t\u0161illikuumus, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Ketšup.png", tag: "", name: "Mõnus Ket\u0161up", desc: "Klassikaline tomatiketšup, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Caramel.png", tag: "", name: "Karamell", desc: "Maitsev ja mõnusalt magus karamell, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Šokolaad.png", tag: "", name: "Šokolaad", desc: "Sulav šokolaadikaste, 90 ml.", price: "1,50 \u20ac" },
        { cat: "sauces", image: "assets/products/Sauces/Maasikamoos.png", tag: "", name: "Maasikamoos", desc: "Maitsev maasikamoos, 90 ml.", price: "1,50 \u20ac" },
    ];

    const menuGrid = $("#menuGrid");

    function renderMenu(filter) {
        const items = filter === "all" ? MENU_ITEMS : MENU_ITEMS.filter((i) => i.cat === filter);

        if (!items.length) {
            menuGrid.innerHTML = '<p class="menu-empty">Selles kategoorias hetkel tooteid pole.</p>';
            return;
        }

        menuGrid.innerHTML = items
            .map(
                (item, index) => `
        <article class="menu-card" style="animation-delay:${index * 45}ms">
          ${item.tag ? `<span class="menu-tagpill">${item.tag}</span>` : ""}
          <div class="menu-image">${item.image ? `<img src="/${item.image}" alt="${item.name}" loading="lazy" decoding="async" width="800" height="500">` : ""}</div>
          <div class="menu-card-body">
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <div class="menu-foot">
              <span class="menu-price">${item.price}</span>
              <button class="btn btn-ghost btn-sm order-trigger" type="button" aria-haspopup="dialog" aria-controls="orderDialog">Telli ↗</button>
            </div>
          </div>
        </article>`
            )
            .join("");
    }

    const tabs = $$(".tab");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => {
                t.classList.remove("is-active");
                t.setAttribute("aria-selected", "false");
                t.tabIndex = -1;
            });
            tab.classList.add("is-active");
            tab.setAttribute("aria-selected", "true");
            tab.tabIndex = 0;
            menuGrid.setAttribute("aria-labelledby", tab.id);
            renderMenu(tab.dataset.filter);
        });
    });

    tabs.forEach((tab, index) => {
        tab.addEventListener("keydown", (event) => {
            const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
            if (!(event.key in keys)) return;
            event.preventDefault();
            tabs[keys[event.key]].focus();
            tabs[keys[event.key]].click();
        });
    });

    renderMenu("promo");

    /* ============================ FAQ ACCORDION ============================ */

    $$(".faq-item").forEach((item) => {
        const btn = $(".faq-q", item);
        const panel = $(".faq-a", item);

        btn.addEventListener("click", () => {
            const isOpen = item.classList.contains("open");

            $$(".faq-item").forEach((other) => {
                other.classList.remove("open");
                $(".faq-q", other).setAttribute("aria-expanded", "false");
                $(".faq-a", other).style.maxHeight = null;
            });

            if (!isOpen) {
                item.classList.add("open");
                btn.setAttribute("aria-expanded", "true");
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });

    window.addEventListener("resize", () => {
        $$(".faq-item.open .faq-a").forEach((panel) => { panel.style.maxHeight = panel.scrollHeight + "px"; });
    }, { passive: true });

    /* ============================ OPEN / CLOSED STATUS ============================ */

    /* index: 0 = Sunday ... 6 = Saturday. null = closed */
    const OPENING_HOURS = {
        tallinn: [[11, 19], null, null, [11, 20], [11, 20], [11, 21], [11, 21]],
        tartu: [[11, 19], null, [11, 20], [11, 20], [11, 20], [11, 22], [11, 22]],
    };

    function estonianNow() {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Tallinn",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(new Date());

        const get = (t) => (parts.find((p) => p.type === t) || {}).value;
        const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

        return {
            day: days[get("weekday")],
            minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
        };
    }

    function updateStatuses() {
        const now = estonianNow();

        Object.keys(OPENING_HOURS).forEach((key) => {
            const el = $(`[data-status="${key}"]`);
            if (!el) return;

            const today = OPENING_HOURS[key][now.day];
            const isOpen = !!today && now.minutes >= today[0] * 60 && now.minutes < today[1] * 60;

            el.classList.toggle("open", isOpen);
            el.classList.toggle("closed", !isOpen);
            el.textContent = isOpen ? `Avatud kuni ${today[1]}:00` : "Hetkel suletud";
        });
    }

    updateStatuses();
    setInterval(updateStatuses, 60000);

    /* ============================ FOOTER YEAR ============================ */

    $("#year").textContent = new Date().getFullYear();

})();
