/* Injects the shared top nav + sidebar into #topnav and #sidebar.
   Active item is set from <body data-page="..."> . Nav links defined once here. */
(function () {
  var CLIENT = { ini: 'KS', name: 'Khukri Spices', grad: 'linear-gradient(145deg,#27B98A,#149068)' };
  var USER   = { ini: 'PK', name: 'Prasiddha Karki', email: 'prasiddha@nirvanaagency.com', grad: 'linear-gradient(150deg,#7A71D8,#4B43A8)' };

  var NAV = [
    { sec: 'Agency' },
    { k: 'overview', l: 'Overview', i: 'layout-dashboard', h: 'agency_dashboard.html' },
    { k: 'clients', l: 'All clients', i: 'users-group', h: 'clients_list.html', c: '8' },
    { sec: CLIENT.name },
    { k: 'contacts', l: 'Contacts', i: 'address-book', h: 'contacts.html' },
    { k: 'lists', l: 'Lists', i: 'tags', h: 'lists.html' },
    { k: 'templates', l: 'Templates', i: 'template', h: 'templates.html' },
    { k: 'campaigns', l: 'Campaigns', i: 'send', h: 'campaigns_list.html' },
    { k: 'flows', l: 'Flows', i: 'route', h: 'flows.html' },
    { k: 'forms', l: 'Forms', i: 'forms', h: 'forms.html' },
    { k: 'reports', l: 'Reports', i: 'chart-bar', h: 'reports.html' },
    { sec: 'Settings' },
    { k: 'team', l: 'Team', i: 'users', h: 'team.html' },
    { k: 'audit', l: 'Activity log', i: 'history', h: 'audit_log.html' },
    { k: 'integrations', l: 'Integrations', i: 'plug', h: 'integrations.html' },
    { k: 'billing', l: 'Billing', i: 'credit-card', h: 'billing.html' },
    { k: 'whitelabel', l: 'White-label', i: 'palette', h: 'whitelabel.html' }
  ];

  var page = document.body.dataset.page || '';

  var tn = document.getElementById('topnav');
  if (tn) {
    tn.outerHTML =
      '<div class="topnav">' +
        '<div class="tn-left">' +
          '<div class="brand"><span class="mark">S</span> SendMyMail <span class="sep">/</span> <span class="agency">Nirvana Agency</span></div>' +
          '<div class="switcher"><span class="av av-sm" style="background:' + CLIENT.grad + ';">' + CLIENT.ini + '</span> ' + CLIENT.name + ' <i class="ti ti-selector chev"></i></div>' +
        '</div>' +
        '<div class="tn-right">' +
          '<button class="icon-btn" title="Search ⌘K"><i class="ti ti-search"></i></button>' +
          '<button class="icon-btn" title="Notifications" onclick="location.href=\'notifications.html\'">' +
            '<i class="ti ti-bell"></i>' +
            '<span class="bell-dot"></span>' +
          '</button>' +
          '<button class="btn btn-primary" onclick="location.href=\'campaign_new.html\'"><i class="ti ti-plus"></i> New campaign</button>' +
          '<div class="user-menu" id="userMenu">' +
            '<span class="av" style="background:' + USER.grad + ';">' + USER.ini + '</span>' +
            '<div class="user-menu-pop">' +
              '<div class="umh">' +
                '<span class="av" style="background:' + USER.grad + ';">' + USER.ini + '</span>' +
                '<div><b>' + USER.name + '</b><small>' + USER.email + '</small></div>' +
              '</div>' +
              '<a onclick="event.stopPropagation();location.href=\'settings.html\'"><i class="ti ti-user"></i> Profile &amp; settings</a>' +
              '<a onclick="event.stopPropagation();location.href=\'notifications.html\'"><i class="ti ti-bell"></i> Notifications</a>' +
              '<a onclick="event.stopPropagation();location.href=\'help.html\'"><i class="ti ti-lifebuoy"></i> Help &amp; support</a>' +
              '<a onclick="event.stopPropagation();"><i class="ti ti-keyboard"></i> Keyboard shortcuts <kbd style="margin-left:auto;font-size:10px;padding:2px 6px;border-radius:5px;background:var(--surface);color:var(--soft);">⌘ /</kbd></a>' +
              '<div class="sep"></div>' +
              '<a class="danger" onclick="event.stopPropagation();"><i class="ti ti-logout"></i> Sign out</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  var sb = document.getElementById('sidebar');
  if (sb) {
    sb.className = 'sidebar';
    var items = NAV.map(function (n) {
      if (n.sec) return '<div class="nav-label">' + n.sec + '</div>';
      var active = n.k === page ? ' active' : '';
      var count = n.c ? '<span class="count">' + n.c + '</span>' : '';
      return '<div class="nav-item' + active + '" onclick="location.href=\'' + n.h + '\'"><i class="ti ti-' + n.i + '"></i> ' + n.l + ' ' + count + '</div>';
    }).join('');
    var helpActive = (page === 'help') ? ' active' : '';
    sb.innerHTML = '<nav class="nav">' + items + '</nav>' +
      '<div class="side-foot">' +
        '<div class="nav-item' + helpActive + '" onclick="location.href=\'help.html\'">' +
          '<i class="ti ti-lifebuoy"></i> Help &amp; support' +
        '</div>' +
      '</div>';
  }

  /* user-menu open/close — toggle on avatar click, close on outside click */
  var um = document.getElementById('userMenu');
  if (um) {
    um.addEventListener('click', function (e) {
      e.stopPropagation();
      um.classList.toggle('open');
    });
    document.addEventListener('click', function () { um.classList.remove('open'); });
  }
})();
