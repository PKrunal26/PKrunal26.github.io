"""Builds projects/onestop/index.html. App screens are HTML redrawn from the OneStop Figma file
(file iGSfi021hVrbofHQfA3dHT, page "OneStop Pitch"); icons are Material Symbols Rounded 400 from
@material-symbols/svg-400, kept as a sprite in scripts/icons/onestop-sprite.html. Photos in
projects/onestop/media were cropped from the Figma exports.

Edit copy here, not in the HTML, then run from design-playground/:  python3 scripts/onestop-page.py
"""
from pathlib import Path

SCR = Path(__file__).resolve().parent
OUT = SCR.parent / 'projects' / 'onestop' / 'index.html'
SPRITE = (SCR / 'icons' / 'onestop-sprite.html').read_text()


def ic(name, cls='i'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{name}"/></svg>'


def status(t='9:30'):
    return f'<div class="p-st"><span>{t}</span><span>{ic("wifi","wf")}<i class="sig"></i><i class="bat"></i></span></div>'


def header(search=None):
    h = ('<div class="p-hd"><span class="p-av">' + ic('person', 'i s') + '</span>'
         '<span class="p-logo">One<i>.</i></span>'
         '<span class="p-bell">' + ic('bell', 'i s') + '<span>2</span></span></div>')
    if search:
        h += f'<div class="p-search">{ic("search","i s")}{search}</div>'
    return h


def nav(on):
    items = [('home', 'Home'), ('food', 'Food'), ('bus', 'Travel'), ('cal', 'Timetable')]
    out = '<div class="p-nav">'
    for k, label in items:
        sel = label == on
        out += f'<span class="{"on" if sel else ""}"><b>{ic(k + ("-f" if sel else ""), "i")}</b>{label}</span>'
    return out + '</div>'


def phone(body, label, t='9:30', navon=None, cls='', top=None, extra=''):
    out = f'<div class="ph {cls}" role="img" aria-label="{label}">' + status(t)
    if top:
        out += top
    out += f'<div class="p-body">{body}</div>'
    if navon:
        out += nav(navon)
    return out + extra + '</div>'


def topbar(title, back=False):
    if back:
        return f'<div class="p-top bk">{ic("back","i l")}{title}</div>'
    return f'<div class="p-top">{title}{ic("close","i l")}</div>'


# ── Map: one drawing of the area around the hostels, reused by Home and Travel ──
MAP_SYMBOL = '''<symbol id="map" viewBox="0 0 328 252">
<rect width="328" height="252" fill="#1a2636"/>
<g fill="#1e2d41"><rect x="46" y="82" width="62" height="34" rx="3"/><rect x="140" y="80" width="80" height="16" rx="3"/><rect x="140" y="186" width="40" height="52" rx="3"/><rect x="248" y="78" width="74" height="72" rx="3"/><rect x="248" y="182" width="74" height="22" rx="3"/><rect x="0" y="136" width="30" height="44" rx="3"/><rect x="74" y="136" width="42" height="40" rx="3"/><rect x="0" y="0" width="24" height="56" rx="3"/><rect x="140" y="0" width="80" height="54" rx="3"/></g>
<g fill="#1f3836"><rect x="142" y="108" width="34" height="26" rx="4"/><rect x="8" y="86" width="26" height="28" rx="4"/><rect x="254" y="214" width="60" height="38" rx="4"/></g>
<g fill="none" stroke="#24354c" stroke-width="3" stroke-linecap="round"><path d="M32 -6 L40 258"/><path d="M128 110 L232 100"/><path d="M182 70 L190 258"/><path d="M-6 122 L122 126"/><path d="M236 212 L334 222"/><path d="M62 70 L70 196"/><path d="M240 160 L334 156"/></g>
<g fill="none" stroke="#2c3f5a" stroke-width="7" stroke-linecap="round"><path d="M-10 70 C60 60 120 80 180 70 S300 55 340 62"/><path d="M122 -10 L128 262"/><path d="M128 142 C180 152 230 176 340 172"/><path d="M-10 194 C40 184 90 204 128 202"/><path d="M232 -10 C226 60 242 120 236 262"/></g>
<g font-family="Figtree,Inter,Arial,sans-serif" font-size="8.5" fill="#8a97ad"><text x="146" y="62">Barak Mess</text><text x="8" y="106">Manas Hostel</text><text x="206" y="96">Umiam Hostel Rd</text><text x="194" y="150" fill="#c98ba7">A-block Umiam hostel</text><text x="180" y="176">MA manasha hostel</text><text x="62" y="226">IITG Faculty</text><text x="62" y="236">Gate Parking</text><text x="236" y="214">Assembly NG</text><text x="0" y="158">ing Hostel Mess</text></g>
<g><path d="M198 40 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#e8a25a"/><circle cx="198" cy="46" r="2.2" fill="#1a2636"/>
<path d="M68 104 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#8a97ad"/><circle cx="68" cy="110" r="2.2" fill="#1a2636"/>
<path d="M196 80 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#4cc38a"/><circle cx="196" cy="86" r="2.2" fill="#1a2636"/>
<path d="M186 132 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#e57fa8"/><circle cx="186" cy="138" r="2.2" fill="#1a2636"/>
<path d="M172 162 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#e8a25a"/><circle cx="172" cy="168" r="2.2" fill="#1a2636"/>
<path d="M228 198 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#8a97ad"/><circle cx="228" cy="204" r="2.2" fill="#1a2636"/>
<path d="M58 150 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#e8a25a"/><circle cx="58" cy="156" r="2.2" fill="#1a2636"/>
<path d="M12 112 a6 6 0 0 1 6 6 c0 5 -6 10 -6 10 s-6 -5 -6 -10 a6 6 0 0 1 6 -6z" fill="#4cc38a"/><circle cx="12" cy="118" r="2.2" fill="#1a2636"/></g>
</symbol>'''


def walk_badge(x, y, txt='5 mins'):
    return (f'<g transform="translate({x} {y})"><rect width="54" height="18" rx="9" fill="#1b2535" opacity=".92"/>'
            f'<use href="#i-walk" x="3" y="2" width="14" height="14" fill="#e5e5e5"/>'
            f'<text x="18" y="12.5" font-family="Figtree,Inter,sans-serif" font-size="9.5" font-weight="600" fill="#e5e5e5">{txt}</text></g>')


def me(x, y):
    return f'<circle cx="{x}" cy="{y}" r="30" fill="#76acff" opacity=".13"/><circle cx="{x}" cy="{y}" r="6" fill="#76acff" stroke="#e5e5e5" stroke-width="2"/>'


def stop_pin(x, y, icon='bus'):
    return (f'<g transform="translate({x} {y})"><path d="M0 -20 a10 10 0 0 1 10 10 c0 7 -10 14 -10 14 s-10 -7 -10 -14 a10 10 0 0 1 10 -10z" fill="#ffe37d"/>'
            f'<use href="#i-{icon}" x="-6.5" y="-16.5" width="13" height="13" fill="#3d3000"/></g>')


def mapsvg(overlay):
    return f'<svg viewBox="0 0 328 252" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#map"/>{overlay}</svg>'


def modes(on):
    out = '<div class="p-modes">'
    for k, label in (('bus', 'Bus'), ('ferry', 'Ferry'), ('rick', 'E-Rikshaw')):
        out += f'<span class="p-mode {"on" if label == on else ""}">{ic(k,"i s")}{label}</span>'
    return out + '</div>'


def mapbtns(fs_top=150, loc_top=196):
    return (f'<span class="p-mapbtn" style="top:{fs_top}px">{ic("fullscreen","i s")}</span>'
            f'<span class="p-mapbtn" style="top:{loc_top}px">{ic("locate","i s")}</span>')


ROUTE_HOME = ('<path d="M180 118 L132 124 L130 176" fill="none" stroke="#76acff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
              + me(180, 118) + stop_pin(130, 186) + walk_badge(136, 140))
ROUTE_STOP = ('<path d="M200 214 L130 206 L126 96 L160 74" fill="none" stroke="#76acff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
              + me(200, 214) + stop_pin(162, 66)
              + '<text x="68" y="62" font-family="Figtree,Inter,sans-serif" font-size="9.5" font-weight="600" fill="#a9c8ff">Kameng</text><text x="68" y="73" font-family="Figtree,Inter,sans-serif" font-size="9.5" font-weight="600" fill="#a9c8ff">Bus Stop</text>'
              + walk_badge(134, 150))
ROUTE_FERRY = ('<path d="M200 214 L236 210 L234 120 L250 40 L300 24" fill="none" stroke="#76acff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0"/>'
               + me(200, 214) + stop_pin(302, 22, 'ferry')
               + '<text x="246" y="46" font-family="Figtree,Inter,sans-serif" font-size="9.5" font-weight="600" fill="#a9c8ff">Ferry Ghat</text>'
               + walk_badge(240, 126, '3 kms'))
ROUTE_RICK = (me(150, 160) + stop_pin(96, 120, 'rick') + stop_pin(212, 108, 'rick') + stop_pin(176, 222, 'rick')
              + '<path d="M150 160 L128 160 L100 124" fill="none" stroke="#76acff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 6"/>')


def mapcard(on, route, cards=True, height=None):
    style = f' style="height:{height}px"' if height else ''
    out = f'<div class="p-map"{style}>{mapsvg(route)}{modes(on)}'
    if cards:
        out += mapbtns(130, 168)
        out += ('<div class="p-cards"><div class="p-mini"><span class="p-busi">' + ic('bus', 'i') + '</span><div><b>Manas Bus Stop</b>Next Bus: 2:30 pm</div></div>'
                '<div class="p-mini off"><span class="p-busi">' + ic('bus', 'i') + '</span><div><b>Manas Bus Stop</b>Next Bus: 3:30 pm</div></div></div>')
    else:
        out += mapbtns()
    return out + '</div>'


def tiles(items):
    return '<div class="p-tiles">' + ''.join(f'<span class="p-tile">{ic(k)}{label}</span>' for k, label in items) + '</div>'


QUICK = [('computer', 'LAN'), ('article', 'Papers'), ('med', 'Medical'), ('contact', 'Contacts')]
SERV = [('lf', 'Lost and<br>Found'), ('payments', 'Rent and<br>Sell'), ('newspaper', 'Blogs'), ('language', 'Intranet<br>Websites')]


def now_card():
    return ('<div class="p-now"><div class="p-date"><small>MON</small><b>24</b></div>'
            '<div class="p-cls"><span class="p-gi">' + ic('book') + '</span><div>10:00 - 11:00 AM<b>Lab Engg. Drawing</b>'
            '<span class="p-loc">' + ic('pin') + 'Core 1 - 1102</span></div></div>'
            '<span class="p-exp">' + ic('down') + '</span></div>')


# ── Screens ──
def home(cls='', pins=False):
    body = (header('Search for a location or address') + mapcard('Bus', ROUTE_HOME) + now_card()
            + '<div class="p-panel dk"><div class="p-h">Quick Links</div>' + tiles(QUICK) + '</div>'
            + '<div class="p-panel dk"><div class="p-h">Services</div>' + tiles(SERV) + '</div>')
    out = phone(body, 'OneStop home screen: search, travel map with the next bus, the next class, quick links and services', '9:30', 'Home', cls)
    if pins:
        out = ('<div class="annot">' + out + ''.join(f'<span class="pin-o" style="top:{t}px" aria-hidden="true">{n}</span>' for n, t in
                                                     ((1, 112), (2, 200), (3, 446), (4, 548), (5, 670))) + '</div>')
    return out


def mess_card(meal='Dinner', time='8:00 pm - 10:15 pm', menu='Dal Makhani, Rasam, Green Peas, Cauliflower, Rice Roti, Salad'):
    meals = ''.join(f'<span class="p-meal {"on" if m == meal else ""}">{m}</span>' for m in ('Breakfast', 'Lunch', 'Dinner'))
    return ('<div class="p-mess"><div class="p-meals">' + meals + '</div>'
            f'<div class="p-menu"><small>{time}</small>{menu}'
            '<div class="p-dd"><span>Mon' + ic('down', 'i s') + '</span><span class="ol">Lohit' + ic('down', 'i s') + '</span></div></div></div>')


def food(cls=''):
    dishes = ['Biryani', 'Strawberry', 'Salad', 'Thali', 'Chilli chicken', 'Momos', 'Oranges', 'Paneer']
    body = (header('Search dish or restaurant name')
            + mess_card()
            + '<div class="p-panel"><div class="p-h">Your Favourite Dishes</div><div class="p-dishes">'
            + ''.join(f'<span class="p-dish"><img src="media/dish{i+1}.webp" alt="">{d}</span>' for i, d in enumerate(dishes))
            + '</div></div><div class="p-h">Outlets near you</div>'
            + '<div class="p-chips"><span class="p-chip on">All</span><span class="p-chip">Snacks</span><span class="p-chip">Non-Veg</span><span class="p-chip">Cake</span><span class="p-chip">South Indian</span></div>'
            + rest_card())
    return phone(body, 'Food tab: the next mess meal for the chosen hostel, offers, favourite dishes and outlets nearby', '1:30', 'Food', cls)


def rest_card(desc='Multicuisine, dine-in, north-indian'):
    return ('<div class="p-rest"><img src="media/outlet.webp" alt=""><div><h4>Florentine Restaurant<i></i></h4>' + desc +
            '<small>Waiting time: 2hrs<br><span class="r">Closes at 10:00 pm</span></small>'
            '<div class="p-act"><span>' + ic('call') + 'Call</span><span>' + ic('pin') + 'Map</span><em>2 kms</em></div></div></div>')


def restaurant(cls=''):
    items = [('Chicken Biryani', 'Chicken, rice, spices.', '₹ 200/-', 1, False), ('Veg Biryani', 'Rice, vegetables, spices.', '₹ 150/-', 8, True),
             ('Chilli Chicken', 'Dry, with spring onion.', '₹ 220/-', 5, False), ('Paneer Tikka', 'Grilled in the tandoor.', '₹ 180/-', 8, True)]
    body = ('<div style="height:4px"></div>' + rest_card('Multicuisine, dine-in')
            + '<div class="p-tabs"><span class="on">Menu</span><span>Combos</span><span>Offers</span></div>'
            + '<div class="p-sel"><span class="p-sw on"><i></i>Veg</span><span class="p-sw"><i></i>Non-Veg</span><span class="p-mut" style="font-size:12.5px">Starters' + ic('down', 'i s') + '</span></div>'
            + '<div>' + ''.join(f'<div class="p-item"><div><b><i class="{"v" if v else ""}"></i>{n}</b>{d}<span class="pr">{p}</span></div><img src="media/dish{img}.webp" alt=""></div>' for n, d, p, img, v in items) + '</div>')
    return phone(body, 'An outlet page: wait and closing time, call and map, and the menu with veg and non-veg toggles', '1:30', None, cls, top=topbar('Florentine Restaurant', True))


def stops_list(rows):
    out = '<div class="p-stops">'
    for name, sub, right, cls, a in rows:
        out += f'<div class="p-stopr {cls}"><span class="p-busi">{ic("bus")}</span><div><b>{name}</b>{sub}</div><em class="{"a" if a else ""}">{right}</em></div>'
    return out + '</div>'


def near(name, sub, right, icon='bus'):
    return f'<div class="p-near"><span class="p-busi">{ic(icon)}</span><div><b>{name}</b>{sub}</div><em>{right}</em></div>'


def travel_stops(cls=''):
    body = (header('Search for a destination') + mapcard('Bus', ROUTE_STOP, cards=False, height=230)
            + near('Kameng Bus Stop', '100 m (nearest)', 'Next bus<br>in 15 mins')
            + '<div class="p-sel"><span class="p-chips"><span class="p-chip big on">Stops</span><span class="p-chip big">Buses</span></span><span>Weekdays' + ic('down', 'i s') + '</span></div>'
            + stops_list([('Biotech Park', '3.2 km', 'Left<br>1:45 PM', '', False), ('Hospital', '2.8 km', 'Left<br>1:45 PM', '', False),
                          ('Kameng', '1 km', '1:45 PM', 'hl', True), ('Subansiri', '1 km', '1:50 PM', '', True), ('Dhansiri', '3 km', '2:10 PM', '', True)]))
    return phone(body, 'Travel, stops: walking route to the nearest stop and where the current bus has already been', '1:30', 'Travel', cls)


def travel_buses(cls=''):
    times = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM']
    body = (header('Search for a destination') + mapcard('Bus', ROUTE_STOP, cards=False, height=180)
            + '<div class="p-sel"><span class="p-chips"><span class="p-chip big">Stops</span><span class="p-chip big on">Buses</span></span><span></span></div>'
            + '<div class="p-sel"><span>Campus ' + ic('fwd', 'i s') + ' City' + ic('down', 'i s') + '</span><span>Weekdays' + ic('down', 'i s') + '</span></div>'
            + '<div class="p-from">Starting From - Biotech Park</div>'
            + stops_list([(t, '', 'Left' if i < 7 else '', '', False) for i, t in enumerate(times)]).replace('<div></div>', ''))
    return phone(body, 'Travel, buses: the whole day of buses between campus and the city', '1:30', 'Travel', cls)


def travel_ferry(cls=''):
    times = [('7:00 AM', 'Left'), ('8:30 AM', 'Left'), ('10:00 AM', 'Left'), ('11:30 AM', 'Left'), ('1:00 PM', 'Left'), ('2:30 PM', 'in 40 mins'), ('4:00 PM', ''), ('5:30 PM', '')]
    body = (header('Search for a destination') + mapcard('Ferry', ROUTE_FERRY, cards=False, height=210)
            + near('Ferry Ghat', '3 kms', 'Next ferry<br>2:30 PM', 'ferry')
            + '<div class="p-sel"><span>Campus ' + ic('fwd', 'i s') + ' City' + ic('down', 'i s') + '</span><span>Weekdays' + ic('down', 'i s') + '</span></div>'
            + stops_list([(t, '', s, 'hl' if s.startswith('in') else '', s.startswith('in')) for t, s in times]).replace('<div><b>', '<div><b>').replace('p-busi">' + ic('bus'), 'p-busi">' + ic('ferry')))
    return phone(body, 'Travel, ferry: the next ferry, the walk to the ghat, and the day of departures', '1:30', 'Travel', cls)


def travel_rick(cls=''):
    body = (header('Search for a destination') + mapcard('E-Rikshaw', ROUTE_RICK, cards=False, height=240)
            + '<div class="p-ride"><div class="p-field">' + ic('locate', 'i s') + '<div><small>Current Location</small>Brahmaputra Hostel, IIT Guwahati</div></div>'
            '<div class="p-field">' + ic('pin', 'i s') + '<div><small>Destination</small>Select destination</div></div>'
            '<div class="p-sel" style="font-size:12.5px"><span class="p-mut">Fixed fare anywhere on campus</span><span class="p-acc">ETA: 5 mins</span></div>'
            '<div class="p-btn">Request Ride</div></div>'
            + '<div class="p-h" style="font-size:13px">Favourite destinations</div>'
            + '<div><div class="p-fav">' + ic('star', 'i s') + '<div>Lohit Hostel<small>Hostel</small></div></div><div class="p-fav">' + ic('star', 'i s') + '<div>Core 1<small>Academic complex</small></div></div></div>')
    return phone(body, 'Travel, e-rickshaw: request a ride from where you are to a destination on campus', '1:30', 'Travel', cls)


def tt_day(cls=''):
    def cls_row(t, n, loc, icon='book', hl=False):
        return f'<div class="p-class {"hl" if hl else ""}"><span class="p-gi">{ic(icon)}</span><div>{t}<b>{n}</b><span class="p-loc">{ic("pin")}{loc}</span></div></div>'
    body = (header()
            + '<div class="p-week"><span class="on" style="--d:1">MON<b>24</b></span><span style="--d:2">TUE<b>25</b></span><span>WED<b>26</b></span><span style="--d:1">THU<b>27</b></span><span>FRI<b>28</b></span></div>'
            + '<div class="p-list">' + cls_row('9:00 - 10:00 AM', 'MA 562 Natesan', 'Core 1 - 1102') + cls_row('10:00 - 11:00 AM', 'MA 562 Natesan', 'Core 1 - 1102')
            + cls_row('11:00 - 12:00 AM', 'CE 206 Geotech Quiz', 'Core 4 - 1102', 'quiz', True) + '<div class="p-brk">Lunch Break</div>'
            + cls_row('1:00 - 4:00 PM', 'HT Lab Cl 211', 'Core 3 - 3302', 'science') + cls_row('4:00 - 5:00 PM', 'MA 562 Natesan', 'Core 1 - 1102')
            + cls_row('6:00 - 7:00 PM', 'SA Course - Swimming', 'Sports Ground', 'pool') + '</div>')
    return phone(body, 'Timetable, day view: five days ahead with quiz dots, then the day of classes, labs, a quiz and a break', '9:30', 'Timetable', cls,
                 extra='<span class="p-fab">' + ic('add') + '</span>')


def tt_week(cls=''):
    def wk(day, mon, course, loc, alt=False):
        return (f'<div class="p-wk"><div class="p-date"><small>{mon}</small><b>{day}</b></div><div class="p-wkc">9:00 AM - 12:00 PM<b>{course}</b>'
                f'<span class="p-loc">{ic("pin")}{loc}</span><hr>2:00 PM - 6:00 PM<b>{course}</b><span class="p-loc">{ic("pin")}{loc}</span></div></div>')
    body = (header() + '<div class="p-tog"><span>Day</span><span class="on">Week</span></div>'
            + '<div class="p-mon">March</div>' + wk('24', 'MON', 'DD 221 User Research', 'Core 1 - B.Des 2') + wk('31', 'MON', 'DD 221 User Research', 'Core 1 - B.Des 2')
            + '<div class="p-mon">April</div>' + wk('07', 'MON', 'DD 231 Ergonomics', 'Core 1 - Ergonomics Lab'))
    return phone(body, 'Timetable for the Design department: one course per week, shown as a consolidated week', '9:30', 'Timetable', cls,
                 extra='<span class="p-fab">' + ic('add') + '</span>')


def lf_list(cls=''):
    items = [('Instant camera', 'Found near Library', '1 hr ago', 3), ('Game console', 'Found near SAC', '2:00 PM', 4), ('Telephone', 'Found near Core 1', '8:00 AM', 2)]
    body = ('<div style="height:2px"></div><div class="p-search">' + ic('search', 'i s') + 'Search Items</div>'
            + '<div class="p-chips"><span class="p-chip big on">Found</span><span class="p-chip big">Lost</span></div>'
            + '<div class="p-day">Today</div><div class="p-lf">'
            + ''.join(f'<div class="p-lfi"><div><b>{n}</b>{w}<br><small>{t}</small></div><img src="media/item{i}.webp" alt=""></div>' for n, w, t, i in items[:2])
            + '</div><div class="p-day">Yesterday</div><div class="p-lf">'
            + ''.join(f'<div class="p-lfi"><div><b>{n}</b>{w}<br><small>{t}</small></div><img src="media/item{i}.webp" alt=""></div>' for n, w, t, i in items[2:])
            + '</div>')
    return phone(body, 'Lost and found: found and lost lists with a photo, where it was found and when', '1:30', None, cls, top=topbar('Lost and Found'),
                 extra='<span class="p-efab">' + ic('add') + 'Found Item</span>')


def lf_photo(cls=''):
    return ('<div class="ph ' + cls + '" role="img" aria-label="Step 1: take a photo of the found item">' + status('1:30') + topbar('1. Upload Photo', True)
            + '<div class="p-prog"><i class="on"></i><i></i><i></i></div>'
            + '<div class="p-cam"><span class="obj"></span><div class="p-shots"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
            + '<div class="p-shutter">' + ic('cam', 'i') + '<b></b>' + ic('refresh', 'i') + '</div>'
            + '<div style="text-align:center;font-size:11px;color:#c9ccd4;padding:0 0 24px">Hold for video, tap for photo</div></div></div>')


def lf_desk(cls=''):
    body = ('<p class="p-intro" style="padding-top:18px">Please submit the found item at your nearest security desk.</p>'
            + '<div class="p-check">I have submitted it' + ic('checkbox') + '</div>'
            + '<div class="p-h">Where did you deposit it at?</div>'
            + ''.join(f'<div class="p-dropd">{d}{ic("down","i s")}</div>' for d in ('Library', 'Hostel', 'SAC', 'Core'))
            + '<div class="p-spacer"></div><div class="p-btn">Next</div>')
    return phone(body, 'Step 2: confirm the item was handed to a security desk and pick which one', '1:30', None, cls,
                 top=topbar('2. Submit at Desk', True) + '<div class="p-prog"><i class="on"></i><i class="on"></i><i></i></div>')


def lf_details(cls=''):
    body = ('<p class="p-intro" style="padding-top:18px">Fill in the details of the found object.</p>'
            + '<div class="p-input">Title*</div><div class="p-input">Location Found*</div><div class="p-input area">Description</div>'
            + '<div class="p-spacer"></div><div class="p-btn">Submit</div>')
    return phone(body, 'Step 3: title, where it was found and a description', '1:30', None, cls,
                 top=topbar('3. Details', True) + '<div class="p-prog"><i class="on"></i><i class="on"></i><i class="on"></i></div>')


def contacts(cls=''):
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'
    body = ('<div style="height:2px"></div><div class="p-search">' + ic('search', 'i s') + 'Search keyword (name, position etc.)</div>'
            + '<div class="p-cats"><span class="p-cat">' + ic('emergency') + 'Emergency</span><span class="p-cat">' + ic('bus') + 'Transport</span><span class="p-cat">' + ic('groups') + 'Gymkhana</span></div>'
            + '<div class="p-day" style="margin-bottom:-4px">' + ic('star', 'i s') + ' Starred</div>'
            + '<div class="p-chips"><span class="p-chip">Gen Sec SWC</span><span class="p-chip">Admin, Finance</span><span class="p-chip">Hospital</span></div>'
            + '<div class="p-me"><i></i>My profile</div>'
            + '<div class="p-contacts"><div class="p-az">' + ''.join(f'<span>{c}</span>' for c in letters) + '</div>'
            + '<div class="lt">C</div><div class="ct">Campus</div><div class="ct">Cells</div><div class="lt">E</div><div class="ct">E-rickshaw</div>'
            + '<div class="ct">Electronics Department</div><div class="lt">H</div><div class="ct">Hospital</div></div>')
    return phone(body, 'Contacts: emergency, transport and Gymkhana numbers, starred contacts and an A to Z directory', '1:30', None, cls, top=topbar('Contacts'))


def internet(cls=''):
    body = ('<p class="p-intro" style="padding-top:18px">You might need to change some of your laptop settings before you could start using the internet in your room. Go through the following steps after connecting your laptop to the LAN port.</p>'
            + '<div class="p-step"><b>Step 6 of 8</b><p>Open Start → Control Panel → Network and Internet → Network and Sharing Center</p>'
            + '<div class="p-dropd" style="box-shadow:inset 0 0 0 1px #8a8f99">Select Hostel' + ic('down', 'i s') + '</div>'
            + ''.join(f'<div class="p-dropd" style="color:#8a8f99">{d}{ic("down","i s")}</div>' for d in ('Block', 'Floor', 'Room Number'))
            + '<div class="nav"><span>' + ic('prev') + '</span><span class="on">' + ic('next') + '</span></div></div>')
    return phone(body, 'Internet settings: step-by-step LAN setup for the chosen hostel, block, floor and room', '1:30', None, cls, top=topbar('Internet Settings'))


# ── Kit: pieces of the design system on their own ──
def kit():
    def chip(t, on=False): return f'<span class="p-chip big {"on" if on else ""}">{t}</span>'
    atoms = ('<div class="ph kit-ph" style="gap:12px;align-items:center">'
             + chip('Stops', True) + chip('Buses') + '<span class="p-mode on">' + ic('bus', 'i s') + 'Bus</span><span class="p-mode">' + ic('ferry', 'i s') + 'Ferry</span>'
             + '<span class="p-sw on"><i></i>Veg</span><span class="p-busi">' + ic('bus') + '</span><span class="p-gi">' + ic('book') + '</span>'
             + '<span class="p-fab" style="position:static">' + ic('add') + '</span><span class="p-btn" style="width:120px">Next</span>'
             + '<span class="p-nav kitnav"><span class="on"><b>' + ic('home-f') + '</b>Home</span><span><b>' + ic('food') + '</b>Food</span></span></div>')
    molecules = ('<div class="ph kit-ph" style="gap:14px;align-items:center">'
                 + '<div style="width:300px;max-width:100%">' + near('Kameng Bus Stop', '100 m (nearest)', 'Next bus<br>in 15 mins') + '</div>'
                 + '<div style="width:300px;max-width:100%" class="p-class"><span class="p-gi">' + ic('book') + '</span><div>9:00 - 10:00 AM<b>MA 562 Natesan</b><span class="p-loc">' + ic('pin') + 'Core 1 - 1102</span></div></div>'
                 + '<div class="p-mini" style="position:static">' + '<span class="p-busi">' + ic('bus') + '</span><div><b>Manas Bus Stop</b>Next Bus: 2:30 pm</div></div></div>')
    organisms = ('<div class="ph kit-ph" style="gap:14px;align-items:flex-start">'
                 + '<div class="p-panel dk" style="width:328px;max-width:100%"><div class="p-h">Quick Links</div>' + tiles(QUICK) + '</div>'
                 + '<div style="width:328px;max-width:100%">' + rest_card() + '</div></div>')
    rows = [('Atoms', 'Chips, toggles, icons, buttons', atoms), ('Molecules', 'Stop, class and map cards', molecules), ('Organisms', 'Panels and outlet cards', organisms)]
    return '<div class="kit" role="img" aria-label="Design system pieces: atoms, molecules and organisms from the OneStop file">' + ''.join(
        f'<div class="kit-row"><span><b>{a}</b>{b}</span><div class="kit-items">{c}</div></div>' for a, b, c in rows) + '</div>'


# ── Wireframes (lo-fi home options) ──
def wire(kind):
    s = ('<svg viewBox="0 0 160 300" aria-hidden="true"><defs><clipPath id="wc' + kind + '"><rect x="2" y="2" width="156" height="296" rx="18"/></clipPath></defs>'
         '<rect class="wf" x="2" y="2" width="156" height="296" rx="18"/><g clip-path="url(#wc' + kind + ')"><rect class="wb" x="14" y="18" width="132" height="14" rx="7"/>')
    if kind == 'a':
        s += ''.join(f'<circle class="wd" cx="{30+i*33}" cy="54" r="11"/>' for i in range(4))
        s += '<rect class="wb" x="14" y="76" width="132" height="16" rx="3"/>'
        s += '<text class="wt" x="20" y="87">Feed</text><text class="wt" x="48" y="87">Mess</text><text class="wt" x="78" y="87">Timetable</text><rect class="wa" x="78" y="90" width="40" height="2"/>'
        for i in range(4):
            y = 106 + i * 44
            s += f'<text class="wt" x="14" y="{y+10}">{8+i}:00</text><rect class="wd" x="22" y="{y+15}" width="1.5" height="20"/><rect class="wb" x="42" y="{y}" width="104" height="34" rx="5"/>'
    elif kind == 'b':
        for r in range(3):
            s += ''.join(f'<circle class="wd" cx="{30+i*33}" cy="{56+r*34}" r="11"/>' for i in range(4))
        s += '<rect class="wb" x="14" y="150" width="132" height="16" rx="3"/>'
        s += '<text class="wt" x="18" y="161">Home</text><text class="wt" x="48" y="161">Mess</text><text class="wt" x="74" y="161">Timetable</text><text class="wt" x="118" y="161">OLX</text>'
        s += '<rect class="wb" x="14" y="176" width="132" height="70" rx="6" opacity=".55"/><rect class="wb" x="0" y="262" width="160" height="40"/>'
        s += ''.join(f'<circle class="wf" cx="{24+i*28}" cy="280" r="8"/>' for i in (0, 1, 3, 4))
        s += '<circle class="wd" cx="80" cy="276" r="12"/>'
    else:
        s += '<rect class="wa" x="14" y="44" width="92" height="66" rx="8"/><text class="wt" x="22" y="80">Calendar widget</text>'
        s += '<rect class="wa" x="14" y="120" width="92" height="40" rx="8"/><text class="wt" x="22" y="143">Menu widget</text>'
        s += '<rect class="wb" x="14" y="170" width="92" height="40" rx="8"/><text class="wt" x="22" y="193">IP settings</text>'
        s += '<rect class="wb" x="14" y="220" width="92" height="40" rx="8" opacity=".6"/>'
        s += ''.join(f'<circle class="wd" cx="130" cy="{56+i*34}" r="12"/>' for i in range(7))
    return s + '</g></svg>'


# ── Subapps diagram ──
def subapps_svg():
    subs = [('Food', 'Mess menu, outlets'), ('Travel', 'Bus, ferry, e-rickshaw'), ('Timetable', 'Classes, events'), ('Lost & found', 'Found and lost items'),
            ('Rent & sell', 'Listings, my ads'), ('Contacts', 'Campus directory'), ('Papers', 'Past papers, notes'), ('LAN settings', 'Steps per hostel'),
            ('Medical', 'Digital medical book'), ('Blogs', 'Club posts'), ('Intranet sites', 'Search by name')]
    s = '<svg viewBox="0 0 960 330" role="img" aria-label="A shell with login, home, search and navigation, connected to eleven subapps and room for more">'
    s += '<rect class="n-y" x="10" y="40" width="230" height="250" rx="16"/><text class="ty" x="30" y="70">Shell</text>'
    for i, t in enumerate(('Login', 'Home', 'Universal search', 'Bottom navigation')):
        y = 86 + i * 46
        s += f'<rect class="n" x="30" y="{y}" width="190" height="36" rx="8"/><text class="t" x="46" y="{y+23}">{t}</text>'
    s += '<path class="ln" d="M240 165 H290"/><path class="ln" d="M290 62 V266"/>'
    cols = [330, 487, 644, 801]
    for i in range(12):
        r, c = divmod(i, 4)
        x, y = cols[c], 30 + r * 92
        if c == 0:
            s += f'<path class="ln" d="M290 {y+32} H{x}"/>'
        if i < 11:
            n, d = subs[i]
            s += f'<rect class="n-a" x="{x}" y="{y}" width="147" height="64" rx="10"/><text class="t" x="{x+14}" y="{y+27}">{n}</text><text class="ts" x="{x+14}" y="{y+46}">{d}</text>'
        else:
            s += f'<rect class="n" x="{x}" y="{y}" width="147" height="64" rx="10" stroke-dasharray="5 5" fill="none"/><text class="tz" x="{x+14}" y="{y+27}">Next subapp</text><text class="ts" x="{x+14}" y="{y+46}">Added by a later team</text>'
    s += '<text class="ts" x="330" y="322">Each subapp has its own developers and can launch on its own</text>'
    return s + '</svg>'


def relay_svg():
    s = '<svg viewBox="0 0 960 200" role="img" aria-label="Developer teams change every year while the design system and subapps carry across">'
    s += '<rect class="n-y" x="0" y="20" width="960" height="44" rx="10"/><text class="t" x="18" y="47">Design system and subapps</text><text class="ts" x="942" y="47" text-anchor="end">carry across every handover</text>'
    teams = [('Year 1 team', 'Builds the first version'), ('Year 2 team', 'Takes over, adds to it'), ('Year 3 team', 'Takes over, adds to it'), ('Year 4 team', 'Takes over, adds to it')]
    for i, (n, d) in enumerate(teams):
        x = 10 + i * 238
        s += f'<rect class="n-a" x="{x}" y="{96 + (i % 2) * 8}" width="220" height="58" rx="10"/><text class="t" x="{x+14}" y="{120 + (i % 2) * 8}">{n}</text><text class="ts" x="{x+14}" y="{140 + (i % 2) * 8}">{d}</text>'
        s += f'<path class="ln" d="M{x+110} 64 V{96 + (i % 2) * 8}"/>'
        if i < 3:
            s += f'<path class="ln-a" d="M{x+222} {125 + (i % 2) * 8} H{x+236}" marker-end="url(#ah)"/>'
    s += '<text class="ts" x="0" y="190">Students graduate in four years; developers hand over every year.</text>'
    return s + '</svg>'


def deps_svg():
    groups = [('Classes', [('Class locations unknown', 'Ask seniors or peers', 0), ('Timetable hard to read', 'A classmate decodes it and posts a picture', 1), ('No schedule for tests', 'Ask peers, stay alert', 0)]),
              ('Meals', [('Mess menu hard to find', 'Zoom into the hostel group picture', 1), ('No list of food outlets', 'Ask on group chats', 1)]),
              ('Getting around', [('Places hard to find', 'Ask seniors or peers, or explore', 0), ('Bus timings', 'Search the inbox for the latest mail', 2), ('Ferry timings', 'No schedule anywhere: ask, then wait', 0), ('E-rickshaw numbers', 'Search the inbox, ask on group chats', 2)]),
              ('Other', [('No lost and found or selling', 'Mail everyone and hope', 2), ('LAN setup is complex', 'Find a friend who knows', 3)])]
    chans = [('Seniors and peers', 'var(--violet)'), ('Group chats', 'var(--green)'), ('Campus inbox', 'var(--yel)'), ('A friend who knows', 'var(--pink)')]
    counts = [0, 0, 0, 0]
    rows = []
    y = 34
    out = '<svg viewBox="0 0 960 @@H@@" role="img" aria-label="Eleven hurdles linked to how people coped: seniors and peers, group chats, the campus inbox, or a friend">'
    out += '<text class="tz" x="0" y="14">Hurdle and how people coped</text><text class="tz" x="700" y="14">Who they depended on</text>'
    for g, items in groups:
        out += f'<text class="ts" x="0" y="{y+4}" style="font-weight:600">{g.upper()}</text>'
        y += 16
        for h, w, c in items:
            rows.append((y, c)); counts[c] += 1
            out += f'<rect class="n" x="0" y="{y}" width="330" height="36" rx="8"/><text class="t" x="14" y="{y+16}" style="font-size:13px">{h}</text><text class="ts" x="14" y="{y+30}" style="font-size:11px">{w}</text>'
            y += 42
        y += 8
    total = sum(counts); top = 40; avail = 460; gap = 18
    unit = (avail - gap * 3) / total
    cy = top; slots = []
    for i, (name, col) in enumerate(chans):
        h = counts[i] * unit
        slots.append([cy, h, 0])
        out += f'<rect x="700" y="{cy:.1f}" width="10" height="{h:.1f}" rx="4" style="fill:{col}"/><text class="t" x="724" y="{cy + h/2:.1f}">{name}</text><text class="ts" x="724" y="{cy + h/2 + 17:.1f}">{counts[i]} of {total} hurdles</text>'
        cy += h + gap
    for ry, c in rows:
        sy, sh, used = slots[c]
        ty = sy + used + unit / 2; slots[c][2] += unit
        col = chans[c][1]
        out += f'<path d="M330 {ry+18} C520 {ry+18} 520 {ty:.1f} 698 {ty:.1f}" style="fill:none;stroke:{col};stroke-width:2;opacity:.75"/>'
    return out.replace('@@H@@', str(int(max(y, cy)) + 6)) + '</svg>'


def menugrid():
    cols = ['#f2c27b', '#a7d3a6', '#f4a3a3', '#b8c7f2']
    return '<span class="v-mg">' + ''.join(f'<i style="--c:{cols[(i // 7 + i) % 4]}"></i>' for i in range(28)) + '</span>'


TT = [('Mon', ['C,C1', 'A', 'B', 'D', 'F', 'A1', 'B1', 'D1', 'F1'], 'ML1', 'AL1'),
      ('Tue', ['E,E1', 'A', 'C', 'D', 'F', 'A1', 'C1', 'D1', 'F1'], 'ML2', 'AL2'),
      ('Wed', ['B,B1', 'A', 'C', 'E', 'G', 'A1', 'C1', 'E1', 'G1'], 'ML3', 'AL3'),
      ('Thu', ['D,D1', 'B', 'C', 'E', 'G', 'B1', 'C1', 'E1', 'G1'], 'ML4', 'AL4'),
      ('Fri', ['A,A1', 'B', 'D', 'F', 'G', 'B1', 'D1', 'F1', 'G1'], 'ML5', 'AL5')]


def ttdoc():
    """The 2020-21 first-year slot grid with the path for a Division IV student in MA 101 (slot C) and lab group AL-3."""
    hours = ['8:00', '9:00', '10:00', '11:00', '12:00', '2:00', '3:00', '4:00', '5:00']
    g = '<table class="tgrid" role="img" aria-label="Week grid of slot letters; the C slots and the AL3 lab are highlighted"><thead><tr><th></th>'
    g += ''.join(f'<th>{h}</th>' + ('<th></th>' if h == '12:00' else '') for h in hours) + '</tr></thead><tbody>'
    for r, (day, slots, ml, al) in enumerate(TT):
        g += f'<tr><td class="d">{day}</td>'
        for i, sl in enumerate(slots):
            hit = sl in ('C', 'C,C1')
            cls = 'hit' if hit else ('dim' if sl.endswith('1') and ',' not in sl else '')
            g += f'<td class="{cls}">{sl}</td>'
            if i == 4:
                g += '<td class="lunch" rowspan="10">' + ('Lunch' if r == 0 else '') + '</td>' if r == 0 else ''
        g += '</tr>'
        g += f'<tr><td class="d"></td><td></td><td colspan="4" class="dim" style="height:18px;font-size:10.5px">{ml}</td><td colspan="4" class="{"lab" if al == "AL3" else "dim"}" style="height:18px;font-size:10.5px">{al}{" · CH 110 L7 · ME 110 L8 · CE 101 L9" if al == "AL3" else ""}</td></tr>'
    g += '</tbody></table>'
    look = '<div class="lookup">'
    look += ('<div class="lk"><h4><i>1</i>Your division, from your branch</h4><table>'
             '<tr><td>I</td><td>CSE, CE</td></tr><tr><td>II</td><td>BT, ECE, EEE</td></tr><tr><td>III</td><td>ME, MC, DD</td></tr>'
             '<tr class="hit"><td>IV</td><td>CL, CST, EPH</td></tr></table></div>')
    look += '<div class="lk"><h4><i>2</i>Theory before or after lunch</h4>Divisions III and IV: theory in the forenoon, slots <mark>A–G</mark>. Labs after lunch.</div>'
    look += ('<div class="lk"><h4><i>3</i>Your course’s slot letter</h4><table><tr><td>A</td><td>PH 101</td><td>B</td><td>EE 101</td></tr>'
             '<tr class="hit"><td>C</td><td>MA 101</td><td>D</td><td>CH 101</td></tr><tr><td>E</td><td>CE 101</td><td>F, G</td><td>other</td></tr></table></div>')
    look += '<div class="lk"><h4><i>4</i>Every C in the week</h4>Tuesday, Wednesday and Thursday at 10:00, and the tutorial on Monday at 8:00.</div>'
    look += '<div class="lk"><h4><i>5</i>Your lab group, and the room</h4>AL-3 on Wednesday afternoon, three labs in rotating rooms. Lecture venue: <mark>check with instructor</mark>.</div>'
    look += '</div>'
    return '<div>' + g + '</div>' + look


def minitt():
    out = '<div class="v-tt2">'
    for day, slots, _, _ in TT[:4]:
        out += ''.join(f'<i class="{"hit" if s in ("C", "C,C1") else ""}">{s.split(",")[0]}</i>' for s in slots[:5])
    return out + '</div>'


def gmap():
    return ('<svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice">'
            '<rect width="240" height="92" style="fill:color-mix(in srgb,var(--green) 8%,var(--card))"/>'
            '<path d="M-5 78 C60 70 140 92 250 74 V100 H-5Z" style="fill:color-mix(in srgb,var(--cyan) 22%,var(--card))"/>'
            '<g style="fill:color-mix(in srgb,var(--soft) 16%,var(--card))"><rect x="18" y="10" width="40" height="22" rx="3"/><rect x="104" y="8" width="52" height="18" rx="3"/><rect x="176" y="22" width="44" height="26" rx="3"/><rect x="22" y="44" width="32" height="18" rx="3"/></g>'
            '<g fill="none" style="stroke:var(--card)" stroke-width="6" stroke-linecap="round"><path d="M-5 38 C60 32 120 44 250 30"/><path d="M84 -5 L94 80"/><path d="M168 -5 C160 30 176 56 170 80"/></g>'
            '<g style="fill:var(--fail)"><circle cx="130" cy="18" r="4.5"/><circle cx="40" cy="20" r="4.5"/><circle cx="198" cy="34" r="4.5"/><circle cx="150" cy="72" r="4.5"/></g>'
            '<g font-size="9.5" font-family="InterVariable,Inter,sans-serif" style="fill:var(--muted)"><text x="138" y="21">?</text><text x="48" y="23">?</text><text x="158" y="66">Ghat · no timings</text></g></svg>')


def waffle():
    return ''.join(f'<i class="{"d" if i < 40 else "m" if i < 94 else ""}"></i>' for i in range(100))


SECTIONS = []

PAGE = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OneStop — Krunal Prajapati</title><meta name="description" content="OneStop: a campus app for IIT Guwahati with mess menus, buses and ferries, a timetable built from a roll number, and lost and found. I designed it for the Students' Web Committee; it passed 10,000 downloads."><link rel="preload" href="../../fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="../../fonts/inter.css?v=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap"><link rel="stylesheet" href="../../style.css?v=31"><link rel="stylesheet" href="onestop.css?v=4"><script src="../../theme.js"></script><script src="../../count.js" async></script><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='5' fill='%233a3a3a'/%3E%3Ctext x='16' y='23' font-family='Arial' font-size='22' text-anchor='middle' fill='white'%3Ek%3C/text%3E%3C/svg%3E"></head>
<body><main class="project os">
<nav aria-label="Home"><a class="back" href="../../">Krunal Prajapati</a></nav>

<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
@@SPRITE@@
@@MAP@@
<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="mk-a" d="M0 1L9 5L0 9Z"/></marker>
</defs></svg>

<header class="hero">
  <h1>OneStop<span class="dot">.</span></h1>
  <p class="lede">A campus app for IIT Guwahati: mess menus, buses and ferries, a timetable that fills itself in, and lost and found. I designed it for the Students’ Web Committee while I was a student there.</p>
  <dl class="facts">
    <div><dt>Role</dt><dd>Product designer</dd></div>
    <div><dt>Team</dt><dd>Students’ Web Committee (SWC), IIT Guwahati</dd></div>
    <div><dt>Time</dt><dd>3 months, 2023</dd></div>
    <div><dt>Status</dt><dd>On <a href="https://play.google.com/store/apps/details?id=com.swciitg.onestop2" target="_blank" rel="noopener">Google Play</a> and the <a href="https://apps.apple.com/in/app/onestop-iitg/id1642792642" target="_blank" rel="noopener">App Store</a></dd></div>
  </dl>
</header>

<figure class="hero-fig">
  <div class="stage" data-fluid-quiet>@@HERO@@</div>
</figure>

<article>
<nav class="toc" aria-label="On this page">
  <p class="toc-h">Problem</p>
  <ol><li><a href="#questions">Questions</a></li><li><a href="#campus">Campus</a></li><li><a href="#day">A day before</a></li><li><a href="#old-timetable">The timetable</a></li><li><a href="#workarounds">Workarounds</a></li><li><a href="#tools">Existing tools</a></li><li><a href="#problems">Nine problems</a></li></ol>
  <p class="toc-h">Decisions</p>
  <ol><li><a href="#constraints">Constraints</a></li><li><a href="#subapps">Subapps</a></li><li><a href="#layout">Home layout</a></li><li><a href="#structure">Structure</a></li><li><a href="#system">Design system</a></li></ol>
  <p class="toc-h">The app</p>
  <ol><li><a href="#home">Home</a></li><li><a href="#food">Food</a></li><li><a href="#travel">Travel</a></li><li><a href="#timetable">Timetable</a></li><li><a href="#lost-found">Lost and found</a></li><li><a href="#quick-links">Quick links</a></li></ol>
  <p class="toc-h">Result</p>
  <ol><li><a href="#testing">Testing</a></li><li><a href="#handoff">Handoff</a></li><li><a href="#after-launch">After launch</a></li><li><a href="#same-day">The same day</a></li><li><a href="#impact">Impact</a></li><li><a href="#learned">What I learned</a></li><li><a href="#get">Get the app</a></li></ol>
</nav>

<div class="part gate" id="part-problem">
  <div><h2>Problem</h2><p>Every year about a thousand freshers walk through this gate into a campus they don’t know. Daily life ran on word of mouth, group chats and an inbox everyone shared.</p></div>
  <figure class="gatefig"><img src="media/gate.webp" width="644" height="780" alt="The stone slab at the IIT Guwahati main gate, with the institute’s name and logo" loading="lazy">
    <figcaption>The main gate. Photo by Ganesh Mohan T, <a href="https://commons.wikimedia.org/wiki/File:IIT_Guwahati_2.jpg" target="_blank" rel="noopener">CC BY-SA 4.0</a>, cut out for this page.</figcaption></figure>
</div>

<section id="questions">
  <div class="prose">
    <h2>Questions</h2>
    <p>Every year a new batch of freshers arrives and asks seniors the same questions. My batch spent its first year and a half online, so we arrived as lost as they were.</p>
    <p>Answers lived in group chats, where a question scrolls away in minutes, and in the campus inbox, where everything from bus timetables to lost umbrellas goes to everyone. The mess menu was a hostel group’s profile picture.</p>
  </div>
  <figure>
    <div class="before">
      <div class="win" role="img" aria-label="A freshers' group chat full of unanswered questions">
        <div class="win-h"><span class="gi"><svg aria-hidden="true"><use href="#i-groups"/></svg></span><div>Freshers group<small>256 members, the group limit</small></div></div>
        <div class="chat">
          <div class="msg" style="--c:#c2410c"><i>A</i><div><b>Ananya</b>Bhaiya, where is good food available on campus?<time>9:02 PM</time></div></div>
          <div class="msg" style="--c:#2563eb"><i>R</i><div><b>Rohit</b>Where is Core 5?<time>9:04 PM</time></div></div>
          <div class="msg" style="--c:#7c3aed"><i>S</i><div><b>Sana</b>The timetable is too difficult to understand.<time>9:11 PM</time></div></div>
          <div class="msg" style="--c:#0f766e"><i>K</i><div><b>Kabir</b>Bhaiya, do you know what time the ferry leaves?<time>9:15 PM</time></div></div>
          <div class="msg" style="--c:#be185d"><i>M</i><div><b>Meera</b>How do I get LAN working in my room?<time>9:26 PM</time></div></div>
          <span class="gap">No replies yet</span>
          <div class="msg" style="--c:#2563eb"><i>R</i><div><b>Rohit</b>Do we have a lost and found system?<time>10:40 PM</time></div></div>
        </div>
      </div>
      <div class="win" role="img" aria-label="A campus inbox searched for the bus timetable, with the timetable mail buried under lost and found and selling mails">
        <div class="win-h"><span class="gi"><svg aria-hidden="true"><use href="#i-mail"/></svg></span><div>Campus inbox<small>Every student gets every mail</small></div></div>
        <div class="mail-s"><svg aria-hidden="true"><use href="#i-search"/></svg>bus timetable</div>
        <div class="mail"><i>LO</i><b>LOST: black umbrella near Core 1</b><time>9:48 AM</time><span>Please reply if you have seen it, it has a wooden handle…</span></div>
        <div class="mail"><i>RE</i><b>Re: LOST: black umbrella near Core 1</b><time>9:52 AM</time><span>Same, lost mine too. Please check the mess.</span></div>
        <div class="mail"><i>SE</i><b>Selling: cycle, barely used</b><time>Yesterday</time><span>Graduating, need it gone by Friday. DM me.</span></div>
        <div class="mail"><i>FO</i><b>FOUND: ID card at the library</b><time>Yesterday</time><span>Collect it from the front desk.</span></div>
        <div class="mail"><i>LO</i><b>LOST!!! White earphones</b><time>Mon</time><span>Somewhere between the hostel and Core 3…</span></div>
        <div class="mail want"><i>TR</i><b>Revised bus timetable from Monday</b><time>2 weeks</time><span>Please find the revised timetable for institute buses attached.</span></div>
      </div>
    </div>
    <figcaption>Recreated. The questions are ones freshers asked; names and mails are made up. Juniors call seniors bhaiya, elder brother.</figcaption>
  </figure>
</section>

<section id="campus">
  <div class="prose">
    <h2>Campus</h2>
    <p>Everyone lives on campus, on the north bank of the Brahmaputra across from the city. Hostels sit at one end, classes at the other. Ferries to the city are public transport, run outside the campus from three ghats along the river.</p>
  </div>
  <figure class="cmap">@@CAMPUS@@
    <div class="cmap-key"><span style="--c:color-mix(in srgb,var(--acc) 55%,var(--panel))"><i></i>Hostels</span><span style="--c:color-mix(in srgb,var(--yel) 60%,var(--panel))"><i></i>Classes</span><span style="--c:color-mix(in srgb,var(--cyan) 20%,var(--panel))"><i></i>Water</span><span><svg width="22" height="8" aria-hidden="true"><path d="M1 4H21" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 4" stroke-linecap="round"/></svg>Straight-line distance</span></div>
    <p class="cmap-src">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors.</p>
  </figure>
  <div class="numrow">
    <div><b>1.1 km</b>from the far hostels to the academic complex</div>
    <div><b>3 ghats</b>for ferries to the city, the nearest 2.1 km from the hostels</div>
    <div><b>1–2 h</b>between one bus or ferry to the city and the next</div>
    <div><b>8,346</b>people living on campus</div>
  </div>
  <div class="prose after"><p>Of them, 7,430 are students, with 406 faculty and 510 staff. Over a thousand students each year are first-year bachelor’s students, new to the place. They were the main audience.</p></div>
  <figure class="campus">
    <div>
      <div class="bar-top"><span>Students</span><b>7,430</b></div>
      <div class="bar" role="img" aria-label="Students by degree: 3,594 bachelor's, 2,192 PhD, 1,644 master's">
        <span class="b1" style="flex:3594"></span><span class="b2" style="flex:2192"></span><span class="b3" style="flex:1644"></span>
      </div>
      <div class="bar-key"><span style="flex:3594"><b>3,594</b>Bachelor’s</span><span style="flex:2192"><b>2,192</b>PhD</span><span style="flex:1644"><b>1,644</b>Master’s</span></div>
    </div>
    <div class="side">
      <div><b>1,000+</b>first-year students each year</div>
      <div><b>86% / 14%</b>men and women<div class="split" aria-hidden="true"><i style="flex:86"></i><i style="flex:14"></i></div></div>
      <div><b>916</b>faculty and staff, plus visiting parents</div>
    </div>
  </figure>
</section>

<section id="day">
  <div class="prose">
    <h2>A day before OneStop</h2>
    <p>I mapped a first-year student’s day from the complaints and interviews. Every small need sent them to an inbox, a group chat or a senior.</p>
  </div>
  <div class="rail" aria-hidden="true"><span>7:30 AM<small>Breakfast</small></span><span>8:50 AM<small>First class</small></span><span>1:00 PM<small>Lunch</small></span><span>3:30 PM<small>Trip to the city</small></span><span>6:00 PM<small>Lost something</small></span><span>10:00 PM<small>Back in the room</small></span></div>
  <div class="story">
    <div class="beat">
      <div class="vig" aria-hidden="true"><div class="v-grp"><i class="v-dp">@@MENUGRID@@</i><div>Hostel group<small>changed the group picture</small></div></div><div class="v-menu">@@MENUGRID@@<span>This week’s menu</span></div></div>
      <div class="beat-t"><time>7:30 AM</time><h3>What’s for breakfast?</h3><ol class="steps"><li>Open the hostel group</li><li>Open the group picture</li><li>Zoom into this week’s menu</li><li>Find today and the meal</li><li>Hope it hasn’t changed</li></ol><div class="cost"><span>5 steps</span><span>WhatsApp</span></div></div>
    </div>
    <div class="beat">
      <div class="vig" aria-hidden="true">@@MINITT@@<div class="v-note">One slot letter, found across the week</div></div>
      <div class="beat-t"><time>8:50 AM</time><h3>Which class, and where?</h3><ol class="steps"><li>Find your division in the groupings PDF</li><li>Check if theory is before or after lunch</li><li>Find your course’s slot letter</li><li>Find that letter in the week grid</li><li>Ask where the class is</li></ol><div class="cost"><span>5 steps</span><span>2 PDFs</span><span class="p">1 person</span></div></div>
    </div>
    <div class="beat">
      <div class="vig" aria-hidden="true"><div class="v-bub me">Bhaiya, where is good food on campus?</div><div class="v-note">Seen · 40 min later</div><div class="v-bub">Try the place near the market, not sure if it’s open</div></div>
      <div class="beat-t"><time>1:00 PM</time><h3>Where to eat?</h3><ol class="steps"><li>Ask a senior</li><li>Wait for a reply</li><li>Walk over and hope it’s open</li></ol><div class="cost"><span>3 steps</span><span class="p">1 person</span></div></div>
    </div>
    <div class="beat">
      <div class="vig" aria-hidden="true"><div class="v-board"><div><small>Majgaon ghat</small><small>Ferry to the city</small></div><div><span>Timetable</span><span>none posted</span></div><div class="gone"><span>Last ferry</span><span>just left</span></div><div><span>Next</span><span>in 1–2 hours</span></div></div><div class="v-note">Public ferries, run outside campus: no mails, no app</div></div>
      <div class="beat-t"><time>3:30 PM</time><h3>A trip to the city</h3><ol class="steps"><li>Ask a senior which ghat to go to</li><li>Get there, 2 km or more</li><li>Find no timetable there either</li><li class="bad">Watch the ferry leave</li></ol><div class="cost"><span>4 steps</span><span class="p">1 person</span><span class="p">1–2 h wait</span></div></div>
    </div>
    <div class="beat">
      <div class="vig" aria-hidden="true"><div class="v-mail"><b>To</b> <span class="to">All students</span><br><b>Subject</b> LOST: earphones near the library<br>If anyone has seen them please reply…</div><div class="v-note">One lost item, 7,430 inboxes</div></div>
      <div class="beat-t"><time>6:00 PM</time><h3>Lost your earphones</h3><ol class="steps"><li>Mail every student on campus</li><li>Wait for replies</li><li>Ask around the library</li></ol><div class="cost"><span>3 steps</span><span>Inbox</span><span class="p">Everyone</span></div></div>
    </div>
    <div class="beat">
      <div class="vig" aria-hidden="true"><div class="v-ip">IP address <b>?</b><br>Gateway <b>?</b><br>DNS server <b>?</b></div><div class="v-bub me">How do I get LAN working in my room?</div></div>
      <div class="beat-t"><time>10:00 PM</time><h3>No internet in the room</h3><ol class="steps"><li>Ask around the hostel</li><li>Find a friend who knows</li><li>Have them set it up</li></ol><div class="cost"><span>3 steps</span><span class="p">1 person</span></div></div>
    </div>
  </div>
  <div class="tally">
    <div><b>23</b>steps across the day</div>
    <div><b>4</b>people to ask for help</div>
    <div><b>1–2 h</b>lost to one missed ferry</div>
    <div><b>7,430</b>inboxes for one lost item</div>
  </div>
  <p class="cap">A typical day put together from the complaints and interviews; steps are counted from the flows above.</p>
</section>

<section id="old-timetable">
  <div class="prose">
    <h2>The timetable</h2>
    <p>The institute shared one timetable for every first-year, as a PDF of slots. Finding a single class took five lookups across two PDFs, and the room was often just “check with instructor”.</p>
    <p>Here is the path for a Chemical Engineering student taking MA 101, from my batch’s first-semester timetable.</p>
  </div>
  <figure class="ttdoc"><div class="ttdoc-in">@@TTDOC@@</div>
    <p class="ttsrc">Redrawn from the <a href="https://www.iitg.ac.in/mgpp/freshers2020/classtt.pdf" target="_blank" rel="noopener">first-year class timetable, Monsoon semester 2020–21</a>, IIT Guwahati. That semester ran online.</p>
  </figure>
</section>

<section id="workarounds">
  <div class="prose">
    <h2>Workarounds</h2>
    <p>I collected complaints from freshers and talked to juniors and peers. For each hurdle I noted how people got by. Every route ran through another person or an inbox.</p>
  </div>
  <figure class="diagram">@@DEPS@@</figure>
  <p class="note"><span class="ic"><svg aria-hidden="true"><use href="#i-groups"/></svg></span><span>Many freshers are introverts, and every workaround here means asking someone. That made each problem worse.</span></p>
</section>

<section id="tools">
  <div class="prose">
    <h2>Existing tools</h2>
    <p>Four things already did part of the job. Each one broke somewhere, which told us what OneStop had to do better.</p>
  </div>
  <div class="tools">
    <div class="tool"><div class="tv" aria-hidden="true"><div class="v-bub me">Bhaiya, which ghat for the ferry?</div><div class="v-bub">The senior who knew graduated</div><span class="tv-tag">No written record</span></div><h3>Word of mouth</h3><h4>Works</h4><ul><li>Juniors meet seniors</li><li>Creates mentors</li></ul><h4>Breaks</h4><ul class="con"><li>No written record</li><li>Hard for introverts</li><li>Leaves when people graduate</li></ul></div>
    <div class="tool"><div class="tv" aria-hidden="true">@@GMAP@@<span class="tv-tag">No ferry or bus timings</span></div><h3>Google Maps</h3><h4>Works</h4><ul><li>Reliable</li><li>Already on every phone</li></ul><h4>Breaks</h4><ul class="con"><li>Many outlets not labelled</li><li>No ferry or bus timings</li><li>Does nothing else</li></ul></div>
    <div class="tool"><div class="tv" aria-hidden="true"><div class="v-row"><b>LOST: black umbrella</b><span>9:48</span></div><div class="v-row"><b>Re: LOST: black umbrella</b><span>9:52</span></div><div class="v-row"><b>Selling: cycle</b><span>9:55</span></div><span class="tv-tag">Easily spammed</span></div><h3>Outlook</h3><h4>Works</h4><ul><li>Everyone is on it</li><li>Groups already exist</li></ul><h4>Breaks</h4><ul class="con"><li>Easily spammed</li><li>Important mails get missed</li><li>No food or travel</li></ul></div>
    <div class="tool"><div class="tv" aria-hidden="true"><div class="tv-grp"><i></i><div>Freshers group<small>256 of 256 members</small></div></div><div class="tv-bar"><b></b></div><span class="tv-tag">Group full</span></div><h3>WhatsApp</h3><h4>Works</h4><ul><li>Good for announcements</li><li>Groups already exist</li></ul><h4>Breaks</h4><ul class="con"><li>256-member limit</li><li>Someone must answer every question</li><li>Hard to keep organised</li></ul></div>
  </div>
  <p class="note"><span class="ic"><svg aria-hidden="true"><use href="#i-campaign"/></svg></span><span>Word of mouth fails quietly. After a two-year break, everyone trained to run the campus broadcasting system had graduated, and nobody left could operate equipment worth over ₹10 crore.</span></p>
</section>

<section id="problems">
  <div class="prose">
    <h2>Nine problems</h2>
    <p>Everything we heard fell into nine problems.</p>
  </div>
  <div class="probs">
    <div class="prob"><span class="spot">@@I:bus@@</span><h3>Travel</h3><p>Ferry and bus timings are easy to miss. No directions to classes and buildings.</p></div>
    <div class="prob"><span class="spot">@@I:food@@</span><h3>Food</h3><p>No list of outlets with their menus, timings and locations.</p></div>
    <div class="prob"><span class="spot">@@I:lf@@</span><h3>Lost and found</h3><p>No system, so lost items get mailed to everyone and bury important mail.</p></div>
    <div class="prob"><span class="spot">@@I:cal@@</span><h3>Timetable</h3><p>Shared as a WhatsApp image, though not everyone in the group takes the same courses.</p></div>
    <div class="prob"><span class="spot">@@I:schedule@@</span><h3>Mess menu</h3><p>Hard to find, and timings change on weekends and holidays.</p></div>
    <div class="prob"><span class="spot">@@I:campaign@@</span><h3>Complaints</h3><p>No central portal, so complaints go unanswered.</p></div>
    <div class="prob"><span class="spot">@@I:article@@</span><h3>Past papers</h3><p>No access to previous year papers or seniors’ notes.</p></div>
    <div class="prob"><span class="spot">@@I:payments@@</span><h3>Selling</h3><p>No way to buy or sell second-hand things, or even to know how.</p></div>
    <div class="prob"><span class="spot">@@I:rick@@</span><h3>E-rickshaw</h3><p>No way to book one and no way to track it.</p></div>
  </div>
</section>

<div class="part" id="part-decisions"><h2>Decisions</h2><p>One app, built by a student team that changes every year.</p></div>

<section id="constraints">
  <div class="prose">
    <h2>Constraints</h2>
    <p>Students had working habits already. Opening the app had to take less effort than the workaround, and the team had to be able to build and keep it.</p>
  </div>
  <div class="cols">
    <div><span class="spot y">@@I:groups@@</span><h3>A new team every year</h3><p>Students graduate, and each year a new developer team takes over. The app had to be easy to hand on.</p></div>
    <div><span class="spot y">@@I:filter-list@@</span><h3>A wide scope</h3><p>Travel, food, classes, lost items and more. Each part had to fit one system so later features could slot in.</p></div>
    <div><span class="spot y">@@I:schedule@@</span><h3>Freshers on their way</h3><p>The institute was calling freshers back to campus. We had to launch before they arrived.</p></div>
  </div>
  <figure class="diagram">@@RELAY@@</figure>
  <div class="pts">
    <div><h3>Easy to use</h3><p>Switching from a habit takes effort. Downloading and using the app has to cost less than the current system.</p></div>
    <div><h3>Easy to build</h3><p>Every feature weighed against what the team could build with the skills it had.</p></div>
    <div><h3>Easy to grow</h3><p>Not every feature could ship at once, so the design had to make room for the ones that came later.</p></div>
  </div>
</section>

<section id="subapps">
  <div class="prose">
    <h2>Subapps</h2>
    <p>Building everything as one app risked chaos for users and for developers. We looked at apps that had the same problem, like Paytm, MyJio and M-Indicator, and split OneStop into subapps.</p>
    <p>A shell holds login, home, search and navigation. Each subapp has its own small group of developers and can launch on its own. A later team can add one without touching the rest.</p>
  </div>
  <figure class="diagram">@@SUBAPPS@@</figure>
</section>

<section id="layout">
  <div class="prose">
    <h2>Home layout</h2>
    <p>I drew three home screens in lo-fi, then the whole team compared them and voted. The team was also the audience, which kept one person’s taste from deciding.</p>
  </div>
  <div class="wires">
    <div class="wire">@@WA@@<div><h3>Timetable first</h3><p>Tabs for each section, with the timetable open by default.</p></div></div>
    <div class="wire">@@WB@@<div><h3>Icon grid</h3><p>An icon for every service. Switching was quick, but the menu confused people and gave nothing to read at a glance.</p></div></div>
    <div class="wire pick">@@WC@@<div><h3>Widgets <small>Chosen</small></h3><p>Widgets on top answer the common questions without a tap. Quick access to everything else sits underneath.</p></div></div>
  </div>
</section>

<section id="structure">
  <div class="prose">
    <h2>Structure</h2>
    <p>With the layout settled I wrote the information architecture so development could start. It doubled as the team’s checklist: we ticked sections off a whiteboard as they were built.</p>
  </div>
  <figure class="ia">
    <div class="ia-in">
      <div class="ia-root"><span class="pill">Login</span>then four tabs in the bottom bar</div>
      <div class="ia-cols">
        <div class="ia-col"><span class="pill">Home</span><ul>
          <li><b>Search</b><span>Recent searches</span></li>
          <li><b>Map</b><span>Bus, ferry, e-rickshaw · nearest stop, next stop, time of arrival, book now · full screen</span></li>
          <li><b>Timetable preview</b><span>Classes, mess timings, custom events</span></li>
          <li><b>Quick links</b><span>LAN (IP calculator, settings) · papers · medical book · contacts</span></li>
          <li><b>Services</b><span>Lost and found · rent and sell · shops · intranet websites</span></li></ul></div>
        <div class="ia-col food"><span class="pill">Food</span><ul>
          <li><b>Mess</b><span>Next meal, menu · breakfast, lunch, dinner · hostel and day</span></li>
          <li><b>Search</b><span>Dishes and outlets</span></li>
          <li><b>Favourites</b><span>Dishes, restaurants</span></li>
          <li><b>Outlets</b><span>Filters: food type, nearby · veg or non-veg, opening time, waiting time, distance, call and map</span></li></ul></div>
        <div class="ia-col tt"><span class="pill">Timetable</span><ul>
          <li><b>Dates</b><span>Work-week view</span></li>
          <li><b>Events</b><span>Classes, mess timings, custom events · title, location, time</span></li>
          <li><b>Add event</b><span>Assignment, exam, other</span></li></ul></div>
        <div class="ia-col tr"><span class="pill">Travel</span><ul>
          <li><b>Bus</b><span>Nearest stop, buses, stops · distance, time to arrival, status</span></li>
          <li><b>Ferry</b><span>Nearest ghat · campus to city, city to campus · timings</span></li>
          <li><b>E-rickshaw</b><span>Book now, bookings, cost sheet · call the nearest, track a booking</span></li></ul></div>
      </div>
    </div>
  </figure>
</section>

<section id="system">
  <div class="prose">
    <h2>Design system</h2>
    <p>We needed a system the team could build fast, with nothing unnecessary in it. We adapted Google’s Material You: developers got ready-made components, and I designed the pieces campus life needed on top, like stop cards, class cards and outlet cards.</p>
  </div>
  <div class="spectrum">
    <div class="spec"><h3>Adopt</h3><p>Use a system as it is.</p><div class="meter"><span>Cost</span><i style="--v:22%"></i><span>Time to build</span><i style="--v:20%"></i><span>Customisation</span><i style="--v:22%"></i><span>Stands out</span><i style="--v:18%"></i></div></div>
    <div class="spec pick"><h3>Adapt <small>Chosen</small></h3><p>Start from Material You and extend it.</p><div class="meter"><span>Cost</span><i style="--v:48%"></i><span>Time to build</span><i style="--v:45%"></i><span>Customisation</span><i style="--v:62%"></i><span>Stands out</span><i style="--v:58%"></i></div></div>
    <div class="spec"><h3>Create</h3><p>Build a system from scratch.</p><div class="meter"><span>Cost</span><i style="--v:94%"></i><span>Time to build</span><i style="--v:94%"></i><span>Customisation</span><i style="--v:96%"></i><span>Stands out</span><i style="--v:94%"></i></div></div>
  </div>
  <div class="cols four">
    <div><h3>Quick</h3><p>People on campus are always in a hurry. The design has to respect their time.</p></div>
    <div><h3>Necessary</h3><p>Every element had to answer one question: is this needed?</p></div>
    <div><h3>Usable</h3><p>The most important one. A good-looking app that people can’t use is pointless.</p></div>
    <div><h3>Accessible</h3><p>Including situational limits, like using the app while cycling across campus.</p></div>
  </div>
  <figure>@@KIT@@<figcaption>Atoms build molecules, molecules build organisms, organisms build screens. Pieces from the OneStop file, redrawn.</figcaption></figure>
</section>

<div class="part" id="part-app"><h2>The app</h2><p>Four tabs: Home, Food, Travel and Timetable. Quick links and services open from Home.</p></div>

<section id="home">
  <div class="prose">
    <h2>Home</h2>
    <p>Home answers the most common questions with no taps at all. It also hosts the subapps, so it can grow over the years.</p>
  </div>
  <div class="feature">
    <div class="stage">@@HOME_TALL@@</div>
    <div>
      <ol class="callouts">
        <li><h3>Search</h3><p>One search bar across every feature and sub-feature. A shortcut for people who use the app often.</p></li>
        <li><h3>Travel</h3><p>Bus, ferry or e-rickshaw. The next departure and the walk to the nearest stop.</p></li>
        <li><h3>Next class</h3><p>The next class or meal with its time and room. Expand it to see the two after.</p></li>
        <li><h3>Quick links</h3><p>LAN settings, past papers, a digital medical book and campus contacts.</p></li>
        <li><h3>Services</h3><p>Lost and found, rent and sell, club blogs and intranet sites.</p></li>
      </ol>
      <p class="note" style="margin-top:8px"><span class="ic"><svg aria-hidden="true"><use href="#i-lf"/></svg></span><span>Lost and found became the most used feature. Rent and sell takes over each year as a batch gets ready to graduate. We later added cab sharing, to find people to split a cab to the airport or station.</span></p>
    </div>
  </div>
</section>

<section id="food">
  <div class="prose">
    <h2>Food</h2>
    <p>Food is mostly for first-years, who don’t know where to eat yet. Seniors use it to check whether their usual place is open.</p>
  </div>
  <figure class="screens"><div class="stage"><div class="row">
    <figure>@@FOOD@@<figcaption>The next mess meal for any hostel and day.</figcaption></figure>
    <figure>@@REST@@<figcaption>An outlet: wait, closing time, call, map and menu.</figcaption></figure>
  </div></div></figure>
  <div class="pts">
    <div><h3>Mess menu</h3><p>The next meal for your hostel and day. Sign in once with your Outlook ID, and nobody zooms into the hostel group picture again.</p></div>
    <div><h3>Outlets</h3><p>Most people don’t know where outlets are, so cards lead with distance, waiting time, closing time, and buttons to call or open the map.</p></div>
    <div><h3>Favourite dishes <span class="later">Later</span></h3><p>Pick a dish and see every outlet selling it, best sellers first. It was hard to build, so it moved to a later release.</p></div>
  </div>
  <p class="note"><span class="ic"><svg aria-hidden="true"><use href="#i-shopping-bag"/></svg></span><span>When I moved to the Coding Club I led the next version of this tab, Campus Cart, with in-app ordering, delivery and payment.</span></p>
</section>

<section id="travel">
  <div class="prose">
    <h2>Travel</h2>
    <p>The next bus or ferry is often one to two hours away, so missing one costs an afternoon. Travel shows what leaves next and how long the walk to the stop takes.</p>
  </div>
  <figure class="screens"><div class="stage"><div class="row four">
    <figure>@@STOPS@@<figcaption>Stops: which stops the bus has left, and how far each one is.</figcaption></figure>
    <figure>@@BUSES@@<figcaption>Buses: the day’s schedule to and from campus.</figcaption></figure>
    <figure>@@FERRY@@<figcaption>Ferry: the next departure and the nearest ghat. Weekend timings differ.</figcaption></figure>
    <figure>@@RICK@@<figcaption>E-rickshaw: request a ride on campus.</figcaption></figure>
  </div></div></figure>
  <div class="pts">
    <div><h3>Smart map</h3><p>Directions to the nearest stop or ghat, or any stop you pick, with the walking time so you know if you’ll make it.</p></div>
    <div><h3>Live status</h3><p>Each stop shows whether the bus has already left it, or when it will arrive.</p></div>
    <div><h3>E-rickshaws</h3><p>They ran on phone calls. Tracking them needed the administration, and talks with them were ongoing.</p></div>
  </div>
</section>

<section id="timetable">
  <div class="prose">
    <h2>Timetable</h2>
    <p>Students enter only their roll number. The app looks up their courses in the college directory and builds the timetable, with labs, sports courses and breaks. It follows the academic calendar for holidays and exams.</p>
  </div>
  <figure class="screens"><div class="stage"><div class="row">
    <figure>@@TTDAY@@<figcaption>Five days ahead, with yellow dots for quizzes, then the day in order.</figcaption></figure>
    <figure>@@TTWEEK@@<figcaption>The Design department runs one course a week, so its timetable folds into weeks.</figcaption></figure>
  </div></div></figure>
  <div class="flow" aria-label="How an assignment or quiz reaches everyone's timetable">
    <div><b>1 · Any student</b><p>Adds an assignment deadline or a quiz to a course.</p></div>
    <div><b>2 · Class representative</b><p>Approves the request.</p></div>
    <div><b>3 · Everyone in the course</b><p>Sees it on their timetable, and in Outlook.</p></div>
  </div>
  <p class="cap">In testing, people rarely looked more than five days ahead, since most timetables repeat every week.</p>
</section>

<section id="lost-found">
  <div class="prose">
    <h2>Lost and found</h2>
    <p>Before OneStop, a lost item meant an email to everyone on campus. Now a found item is a short report, and the app keeps a record of where each item was handed in.</p>
  </div>
  <figure class="screens"><div class="stage"><div class="row four">
    <figure>@@LF@@<figcaption>Found and lost items, newest first.</figcaption></figure>
    <figure>@@LF1@@<figcaption>1. A photo of the item.</figcaption></figure>
    <figure>@@LF2@@<figcaption>2. Hand it to a security desk.</figcaption></figure>
    <figure>@@LF3@@<figcaption>3. What it is and where it was found.</figcaption></figure>
  </div></div></figure>
</section>

<section id="quick-links">
  <div class="prose">
    <h2>Quick links</h2>
    <p>Small things that every fresher asks about.</p>
  </div>
  <figure class="screens"><div class="stage"><div class="row">
    <figure>@@CONTACTS@@<figcaption>Every important number on campus in one directory.</figcaption></figure>
    <figure>@@NET@@<figcaption>Older hostels need manual LAN setup. Steps for your exact room.</figcaption></figure>
  </div></div></figure>
  <div class="pts">
    <div><h3>Contacts</h3><p>Most students don’t have the medical section, emergency or Gymkhana numbers. Now they are a search away.</p></div>
    <div><h3>Internet settings</h3><p>Many hostels have old LAN that needs a manual setup most people don’t know. The app walks through it.</p></div>
    <div><h3>Medical book</h3><p>A digital copy of the paper medical book every student carries to the hospital, with history and past prescriptions.</p></div>
  </div>
</section>

<div class="part" id="part-result"><h2>Result</h2><p>Tested with friends and freshers, launched before the batch arrived, then fixed what users reported. The day got shorter.</p></div>

<section id="testing">
  <div class="prose">
    <h2>Testing</h2>
    <p>Once each flow worked as an MVP, we tested it with friends and freshers using a cognitive walkthrough of three key tasks. Scores are out of 10.</p>
  </div>
  <div class="tests">
    <div class="test"><h3>Check mess timings</h3>
      <div class="q"><p>Went to the Food tab<b>10</b></p><i style="--s:10"></i></div>
      <div class="q"><p>Used OneStop to check mess timings<b>7</b></p><i style="--s:7"></i></div>
      <div class="q low"><p>Satisfied with the information<b>5</b></p><i style="--s:5"></i><small>Wanted menus for other hostels’ messes</small></div>
      <div class="q"><p>Used it at the expected time and place<b>8</b></p><i style="--s:8"></i></div></div>
    <div class="test"><h3>See the next ferry</h3>
      <div class="q"><p>Went to the Travel tab<b>8</b></p><i style="--s:8"></i></div>
      <div class="q"><p>Used OneStop to check ferry timings<b>7</b></p><i style="--s:7"></i></div>
      <div class="q"><p>Satisfied with the information<b>9</b></p><i style="--s:9"></i></div>
      <div class="q"><p>Used it at the expected time and place<b>6</b></p><i style="--s:6"></i></div></div>
    <div class="test"><h3>Report a found item</h3>
      <div class="q"><p>Went to Lost and found<b>10</b></p><i style="--s:10"></i></div>
      <div class="q low"><p>Followed the flow as expected<b>5</b></p><i style="--s:5"></i><small>Some found the flow hard to follow</small></div>
      <div class="q"><p>Felt better than the current system<b>7</b></p><i style="--s:7"></i></div>
      <div class="q"><p>Used it at the expected time and place<b>8</b></p><i style="--s:8"></i></div></div>
  </div>
  <div class="fixes">
    <div class="fix"><span><small>Finding</small>People wanted other hostels’ menus</span><span class="ic"><svg aria-hidden="true"><use href="#i-fwd"/></svg></span><span><small>Final design</small>The mess card has a hostel and a day picker</span></div>
    <div class="fix"><span><small>Finding</small>The found-item flow was hard to follow</span><span class="ic"><svg aria-hidden="true"><use href="#i-fwd"/></svg></span><span><small>Final design</small>Three numbered steps with a progress bar</span></div>
  </div>
</section>

<section id="handoff">
  <div class="prose">
    <h2>Handoff</h2>
  </div>
  <div class="pts" style="margin-top:0">
    <div><h3>Material components</h3><p>Building on Material You meant developers started from ready-made code.</p></div>
    <div><h3>One page of interactions</h3><p>Every interaction in the app sat on one page of the Figma file, so nobody had to guess.</p></div>
    <div><h3>Review sessions</h3><p>I sat with developers to point out where the build didn’t match the design.</p></div>
  </div>
</section>

<section id="after-launch">
  <div class="prose">
    <h2>After launch</h2>
    <p>Users reported bugs and requests on our GitHub issue tracker.</p>
  </div>
  <div class="tbl">
    <table>
      <thead><tr><th>Section</th><th>Complaints</th><th>Requests</th></tr></thead>
      <tbody>
        <tr><td class="grp">Home</td><td>Lost and found gets spammed<br>Too many items in buy and sell</td><td>A quick link to the complaints portal<br>Admin sites like the academic portal</td></tr>
        <tr><td class="grp">Travel</td><td>Bus tracking is inaccurate</td><td>An e-rickshaw section<br>Cab sharing from the airport and station</td></tr>
        <tr><td class="grp">Food</td><td>Bugs and outdated data</td><td>Ordering and payment</td></tr>
        <tr><td class="grp">Timetable</td><td>Schedule changes not showing<br>Assignments not showing</td><td>A timetable for the Design department<br>Midsem and endsem schedules</td></tr>
      </tbody>
    </table>
  </div>
  <div class="pts two">
    <div><h3>Spam</h3><p>Some of it was funny, but it hurt the experience. Sorting and filters came first, with moderator roles planned for the long term.</p></div>
    <div><h3>Next</h3><p>Cab sharing shipped. A week view for the Design department’s timetable and Campus Cart, for ordering food, were in the works.</p></div>
  </div>
</section>

<section id="same-day">
  <div class="prose">
    <h2>The same day, with OneStop</h2>
    <p>The same six moments, now answered by the app. Most need one tap or none.</p>
  </div>
  <div class="compare">
    <div class="cmp-h"><span>Moment</span><span>Before</span><span>With OneStop</span></div>
    <div class="cmp-r"><div>7:30 AM<b>Breakfast</b></div><div class="was"><s>Open the hostel group, zoom into the menu picture</s><br><em>5 steps</em></div><div class="now"><div class="snip">@@SN1@@</div><p>The Food tab shows the next meal for your hostel.<br><em>1 tap</em></p></div></div>
    <div class="cmp-r"><div>8:50 AM<b>First class</b></div><div class="was"><s>Two PDFs, five lookups, then ask for the room</s><br><em>5 steps · 1 person</em></div><div class="now"><div class="snip">@@SN2@@</div><p>Home shows the next class and its room.<br><em>0 taps</em></p></div></div>
    <div class="cmp-r"><div>1:00 PM<b>Lunch</b></div><div class="was"><s>Ask a senior, wait, hope it’s open</s><br><em>3 steps · 1 person</em></div><div class="now"><div class="snip">@@SN3@@</div><p>Outlets near you, with waiting and closing times.<br><em>1 tap</em></p></div></div>
    <div class="cmp-r"><div>3:30 PM<b>City trip</b></div><div class="was"><s>Ask which ghat, get there, wait for the next one</s><br><em>4 steps · 1 person · 1–2 h wait</em></div><div class="now"><div class="snip">@@SN4@@</div><p>The next ferry and the walk to the ghat, so you leave on time.<br><em>1 tap</em></p></div></div>
    <div class="cmp-r"><div>6:00 PM<b>Lost earphones</b></div><div class="was"><s>Mail all 7,430 students and wait</s><br><em>3 steps · everyone</em></div><div class="now"><div class="snip">@@SN5@@</div><p>Check what’s been found, and where it was handed in.<br><em>2 taps</em></p></div></div>
    <div class="cmp-r"><div>10:00 PM<b>No internet</b></div><div class="was"><s>Ask around for a friend who knows</s><br><em>3 steps · 1 person</em></div><div class="now"><div class="snip">@@SN6@@</div><p>Steps for your exact hostel, block and room.<br><em>1 tap</em></p></div></div>
  </div>
  <div class="tally after">
    <div><b>6</b>taps across the day, down from 23 steps</div>
    <div><b>0</b>people to ask</div>
    <div><b>1</b>app, instead of group chats, PDFs and an inbox</div>
    <div><b>0</b>mass mails for a lost item</div>
  </div>
  <p class="cap">Taps counted from the Home screen.</p>
</section>

<section id="impact">
  <div class="prose">
    <h2>Impact</h2>
    <p>OneStop launched before the freshers arrived. We tracked a few numbers after launch to check the effect of each change. These were the numbers when I wrote this up in 2023.</p>
  </div>
  <div class="stats">
    <div class="stat"><span class="num">10k+</span><p>Downloads</p></div>
    <div class="stat"><span class="num">3k+</span><p>Daily active users</p></div>
    <div class="stat"><span class="num">7k+</span><p>Monthly active users</p></div>
    <div class="stat"><span class="num">4.7</span><p>Rating from 200+ reviews<span class="stars" aria-hidden="true">@@STARS@@</span></p></div>
  </div>
  <div class="impact">
    <figure>
      <div class="waffle" role="img" aria-label="Out of 100 squares for 7,430 students, 40 are daily users and 94 monthly users">@@WAFFLE@@</div>
      <div class="wkey">
        <div style="--c:var(--acc)"><i></i><span><b>3k+ daily users,</b> about 4 in 10 students</span></div>
        <div style="--c:color-mix(in srgb,var(--acc) 38%,var(--card))"><i></i><span><b>7k+ monthly users,</b> close to the whole student body</span></div>
        <div style="--c:var(--rule2)"><i></i><span><b>7,430 students</b> on campus, one square for about 74</span></div>
      </div>
      <figcaption>Users compared with the student body. Faculty and staff use the app too, so this is a rough share.</figcaption>
    </figure>
    <div class="facts2">
      <div class="fact2"><b>43%</b><p><strong>of monthly users open it every day</strong>3k daily out of 7k monthly.</p></div>
      <div class="fact2"><b>10k+</b><p><strong>downloads, more than people on campus</strong>About 8,350 students, faculty and staff live there.</p></div>
      <div class="fact2"><b>23 → 6</b><p><strong>steps to taps in a typical day</strong>From the day before and after, above.</p></div>
      <div class="fact2"><b class="fi"><svg aria-hidden="true"><use href="#i-school"/></svg></b><p><strong>Named at freshers’ orientation</strong>The Dean of Student Affairs mentioned OneStop at the official orientation.</p></div>
    </div>
  </div>
</section>

<section id="learned">
  <div class="prose">
    <h2>What I learned</h2>
  </div>
  <div class="learn" style="margin-top:0">
    <div><h3>Research saves iteration</h3><p>A problem found in user testing takes far longer to fix than the same problem found in research.</p></div>
    <div><h3>Argue for the design</h3><p>Explaining my decisions to seniors was a skill I had to learn, and it kept the original vision intact.</p></div>
    <div><h3>Keep going</h3><p>Technical problems delayed the launch more than once. Keeping the team’s spirits up got us there.</p></div>
  </div>
</section>

<section id="get">
  <div class="prose">
    <h2>Get the app</h2>
    <p>OneStop IITG is on Google Play and the App Store. SWC teams have kept working on it since I graduated, so the live app may look different from these designs.</p>
  </div>
  <div class="stores">
    <a class="store" href="https://play.google.com/store/apps/details?id=com.swciitg.onestop2" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.5-9.7-9.5-9.7Zm10.6 10.8 2.6 2.6-11 6.3 8.4-8.9Zm3.9-2.2 2.9 1.6c.8.5.8 1.3 0 1.8l-2.9 1.7-2.8-2.5 2.8-2.6ZM5.8 1.6l11 6.3-2.6 2.6-8.4-8.9Z"/></svg>Google Play</a>
    <a class="store" href="https://apps.apple.com/in/app/onestop-iitg/id1642792642" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.4-3.9ZM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z"/></svg>App Store</a>
  </div>
</section>

<section class="next">
  <a class="next-card" href="../paradime/" data-fluid="../../thumbs/paradime.webp">
    <span class="next-text"><span class="next-label">Next project</span><span class="next-title">Paradime Marketplace</span><span class="next-line">A community and marketplace for a dbt code editor.</span><span class="next-go">Read the case study →</span></span>
    <img src="media/next-paradime.webp" alt="" loading="lazy">
  </a>
</section>

</article>
<footer><a href="../../">All projects</a></footer>
</main>
<script src="onestop.js?v=3" defer></script>
<script src="../../fluid.js" defer></script>
</body></html>
'''

import re

html = PAGE.replace('@@SPRITE@@', SPRITE).replace('@@MAP@@', MAP_SYMBOL)
html = html.replace('@@HERO@@', food('short') + home() + travel_stops('short'))
html = html.replace('@@CAMPUS@@', (SCR / 'data' / 'onestop-campus.svg').read_text())
html = html.replace('@@SUBAPPS@@', subapps_svg()).replace('@@RELAY@@', relay_svg()).replace('@@DEPS@@', deps_svg())
html = html.replace('@@TTDOC@@', ttdoc()).replace('@@MINITT@@', minitt()).replace('@@MENUGRID@@', menugrid()).replace('@@GMAP@@', gmap())
html = html.replace('@@WAFFLE@@', waffle()).replace('@@STARS@@', ''.join('<svg><use href="#i-star-f"/></svg>' for _ in range(5)))
snip = lambda inner: '<div class="ph">' + inner + '</div>'
html = html.replace('@@SN1@@', snip(mess_card('Breakfast', '7:30 am - 9:30 am', 'Poha, Boiled Eggs, Bread, Butter, Tea')))
html = html.replace('@@SN2@@', snip(now_card().replace('10:00 - 11:00 AM', '9:00 - 10:00 AM').replace('Lab Engg. Drawing', 'MA 562 Natesan')))
html = html.replace('@@SN3@@', snip(rest_card()))
html = html.replace('@@SN4@@', snip(near('Ferry Ghat', '3 kms · 5 min walk', 'Next ferry<br>3:30 PM', 'ferry')))
html = html.replace('@@SN5@@', snip('<div class="p-lfi"><div><b>Earphones</b>Found near Library<br><small>1 hr ago</small></div><span class="p-lfx">' + ic('headphones') + '</span></div>'))
html = html.replace('@@SN6@@', snip('<div class="p-step" style="background:none;padding:0"><b>Step 1 of 8</b><p>Open Start → Control Panel → Network and Internet → Network and Sharing Center</p><div class="p-dropd" style="box-shadow:inset 0 0 0 1px #8a8f99">Brahmaputra' + ic('down', 'i s') + '</div></div>'))
html = html.replace('@@WA@@', wire('a')).replace('@@WB@@', wire('b')).replace('@@WC@@', wire('c'))
html = html.replace('@@KIT@@', kit())
html = html.replace('@@HOME_TALL@@', home('tall', pins=True))
html = html.replace('@@FOOD@@', food()).replace('@@REST@@', restaurant())
html = html.replace('@@STOPS@@', travel_stops()).replace('@@BUSES@@', travel_buses()).replace('@@FERRY@@', travel_ferry()).replace('@@RICK@@', travel_rick())
html = html.replace('@@TTDAY@@', tt_day()).replace('@@TTWEEK@@', tt_week())
html = html.replace('@@LF@@', lf_list()).replace('@@LF1@@', lf_photo()).replace('@@LF2@@', lf_desk()).replace('@@LF3@@', lf_details())
html = html.replace('@@CONTACTS@@', contacts()).replace('@@NET@@', internet())
html = re.sub(r'@@I:([a-z-]+)@@', lambda m: f'<svg aria-hidden="true"><use href="#i-{m.group(1)}"/></svg>', html)
assert '@@' not in html, re.findall(r'@@\w+', html)
OUT.write_text(html)
print(len(html))
