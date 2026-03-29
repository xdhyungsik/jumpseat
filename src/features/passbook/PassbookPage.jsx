// src/features/passbook/PassbookPage.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ALL_AIRPORTS } from "../zed/zedData";
import { CARRIERS } from "../zed/zedData";
import { getPassLog, createPassEntry, deletePassEntry } from "../../lib/supabase";
import { Trash2 } from "lucide-react";
import clsx from "clsx";

// ─── Airport Coordinates (lat, lon) ──────────────────────────────────────────
const AIRPORT_COORDS = {
  // Replace the entire AIRPORT_COORDS block in PassbookPage.jsx with this:
    // ── USA Major Hubs ──
    ATL:[33.6407,-84.4277], BOS:[42.3656,-71.0096], ORD:[41.9742,-87.9073],
    MDW:[41.7868,-87.7522], DFW:[32.8998,-97.0403], DAL:[32.8471,-96.8518],
    DEN:[39.8561,-104.6737], LAX:[33.9425,-118.4081], MIA:[25.7959,-80.2870],
    FLL:[26.0726,-80.1527], JFK:[40.6413,-73.7781], LGA:[40.7769,-73.8740],
    EWR:[40.6895,-74.1745], SEA:[47.4502,-122.3088], SFO:[37.6213,-122.3790],
    OAK:[37.7213,-122.2208], SJC:[37.3626,-121.9290], IAD:[38.9531,-77.4565],
    DCA:[38.8521,-77.0377], BWI:[39.1754,-76.6682], IAH:[29.9902,-95.3368],
    HOU:[29.6454,-95.2789], MSP:[44.8848,-93.2223], DTW:[42.2162,-83.3554],
    CLT:[35.2140,-80.9431], PHX:[33.4373,-112.0078], MCO:[28.4294,-81.3090],
    TPA:[27.9755,-82.5332], LAS:[36.0840,-115.1537], SLC:[40.7884,-111.9778],
    PDX:[45.5898,-122.5951], SAN:[32.7338,-117.1933], STL:[38.7487,-90.3700],
    MCI:[39.2976,-94.7139], MSY:[29.9934,-90.2580], RDU:[35.8776,-78.7875],
    PIT:[40.4915,-80.2329], CVG:[39.0488,-84.6678], IND:[39.7173,-86.2944],
    CMH:[39.9980,-82.8919], BDL:[41.9389,-72.6832], MKE:[42.9472,-87.8966],
    // ── USA Regional ──
    CLE:[41.4117,-81.8498], BUF:[43.1085,-78.7322], SYR:[43.1112,-76.1063],
    ROC:[43.1189,-77.6724], ALB:[42.7483,-73.8017], BTV:[44.4720,-73.1533],
    PWM:[43.6462,-70.3093], MHT:[42.9326,-71.4357], PVD:[41.7240,-71.4282],
    HPN:[41.0670,-73.7076], BGR:[44.8074,-68.8281], BNA:[36.1245,-86.6782],
    MEM:[35.0424,-89.9767], BHM:[33.5629,-86.7535], JAX:[30.4941,-81.6879],
    SAV:[32.1276,-81.2021], CHS:[32.8986,-80.0405], RIC:[37.5052,-77.3197],
    ORF:[36.8976,-76.0353], GSO:[36.0978,-79.9373], GSP:[34.8957,-82.2189],
    OMA:[41.3032,-95.8941], TUL:[36.1984,-95.8881], OKC:[35.3931,-97.6007],
    LIT:[34.7294,-92.2243], MCI:[39.2976,-94.7139], DSM:[41.5340,-93.6631],
    MSN:[43.1399,-89.3375], GRR:[42.8808,-85.5228], FNT:[42.9654,-83.7436],
    LAN:[42.7787,-84.5874], TOL:[41.5868,-83.8078], DAY:[39.9024,-84.2194],
    LEX:[38.0365,-84.6059], EVV:[38.0369,-87.5324], SBN:[41.7087,-86.3173],
    ABQ:[35.0402,-106.6090], ELP:[31.8072,-106.3779], TUS:[32.1161,-110.9410],
    BOI:[43.5644,-116.2228], RNO:[39.4991,-119.7681], SMF:[38.6954,-121.5908],
    SBA:[34.4262,-119.8401], GEG:[47.6199,-117.5338], BZN:[45.7775,-111.1603],
    MSO:[46.9163,-114.0906], GTF:[47.4820,-111.3710], BIL:[45.8077,-108.5428],
    CPR:[42.9080,-106.4644], RAP:[44.0453,-103.0574], FSD:[43.5820,-96.7419],
    CID:[41.8847,-91.7108], MLI:[41.4485,-90.5075], DBQ:[42.4020,-90.7095],
    HNL:[21.3187,-157.9225], OGG:[20.8986,-156.3050], KOA:[19.7388,-156.0456],
    LIH:[21.9760,-159.3388], ANC:[61.1743,-149.9963], FAI:[64.8151,-147.8560],
    JNU:[58.3550,-134.5763], SIT:[57.0471,-135.3617], GUM:[13.4834,144.7959],
    // ── Canada ──
    YYZ:[43.6772,-79.6306], YUL:[45.4657,-73.7455], YVR:[49.1967,-123.1815],
    YYC:[51.1315,-114.0106], YEG:[53.3097,-113.5827], YOW:[45.3225,-75.6692],
    YHZ:[44.8808,-63.5086], YQB:[46.7911,-71.3933], YWG:[49.9100,-97.2398],
    YXE:[52.1708,-106.6993], YQR:[50.4319,-104.6659], YYJ:[48.6469,-123.4258],
    YLW:[49.9561,-119.3778], YKF:[43.4608,-80.3786], YTZ:[43.6275,-79.3962],
    // ── Mexico / Central America ──
    MEX:[19.4363,-99.0721], CUN:[21.0365,-86.8771], GDL:[20.5218,-103.3111],
    MTY:[25.7785,-100.1068], TIJ:[32.5411,-116.9700], MID:[20.9370,-89.6577],
    OAX:[13.7550,-90.5198], PVR:[20.6801,-105.2544], SJD:[23.1518,-109.7210],
    ZIH:[17.6014,-101.4606], AGU:[21.7056,-102.3181], BJX:[20.9935,-101.4808],
    HMO:[29.0959,-111.0478], CUL:[24.7645,-107.4748], MZT:[23.1614,-106.2659],
    TAM:[22.2964,-97.8659], VER:[19.1460,-96.1873], DGO:[24.1242,-104.5279],
    GUA:[14.5833,-90.5275], SAL:[13.4409,-89.0557], TGU:[14.0608,-87.2172],
    MGA:[12.1415,-86.1682], SJO:[9.9939,-84.2088], PTY:[9.0713,-79.3835],
    HAV:[22.9892,-82.4091], NAS:[25.0390,-77.4662], MBJ:[18.5037,-77.9134],
    KIN:[17.9357,-76.7875], POS:[10.5954,-61.3372], BGI:[13.0746,-59.4925],
    SDQ:[18.4297,-69.6689], SJU:[18.4394,-66.0018], STT:[18.3373,-64.9733],
    // ── South America ──
    GRU:[-23.4356,-46.4731], GIG:[-22.8099,-43.2505], BSB:[-15.8711,-47.9186],
    SSA:[-12.9086,-38.3225], REC:[-8.1265,-34.9237], FOR:[-3.7762,-38.5326],
    BEL:[-1.3793,-48.4763], MAO:[-3.0386,-60.0497], CGB:[-15.6531,-56.1167],
    CGH:[-23.6261,-46.6563], CGR:[-20.4687,-54.6725], CWB:[-25.5285,-49.1758],
    POA:[-29.9944,-51.1714], FLN:[-27.6703,-48.5522], NAT:[-5.9114,-35.2477],
    MCZ:[-9.5108,-35.7917], VCP:[-23.0074,-47.1345], SDU:[-22.9105,-43.1631],
    MVD:[-34.8384,-56.0308], ASU:[-25.2400,-57.5198], LPB:[-16.5133,-68.1923],
    VVI:[-17.6448,-63.1354], CBB:[-17.4211,-66.1774], SCL:[-33.3930,-70.7858],
    EZE:[-34.8222,-58.5358], AEP:[-34.5592,-58.4156], BOG:[4.7016,-74.1469],
    MDE:[6.1645,-75.4230], CLO:[3.5432,-76.3816], BAQ:[10.8896,-74.7808],
    CTG:[10.4424,-75.5130], LIM:[-12.0219,-77.1143], UIO:[-0.1292,-78.3576],
    GYE:[-2.1574,-79.8836],
    // ── UK & Ireland ──
    LHR:[51.4700,-0.4543], LGW:[51.1537,-0.1821], LTN:[51.8747,-0.3683],
    STN:[51.8850,0.2350], MAN:[53.3537,-2.2750], BHX:[52.4539,-1.7480],
    EDI:[55.9500,-3.3725], GLA:[55.8719,-4.4331], BFS:[54.6575,-6.2158],
    DUB:[53.4213,-6.2701], SNN:[52.7020,-8.9248], ORK:[51.8413,-8.4911],
    // ── France ──
    CDG:[49.0097,2.5479], ORY:[48.7233,2.3794], NCE:[43.6584,7.2150],
    LYS:[45.7256,5.0811], MRS:[43.4393,5.2214], TLS:[43.6293,1.3678],
    BOD:[44.8283,-0.7156], NTE:[47.1532,-1.6108], LIL:[50.5619,3.0894],
    MPL:[43.5762,3.9630], BIQ:[43.4683,-1.5231], SXB:[48.5383,7.6283],
    // ── Germany ──
    FRA:[50.0379,8.5622], MUC:[48.3537,11.7750], DUS:[51.2895,6.7668],
    BER:[52.3667,13.5033], STR:[48.6899,9.2220], HAM:[53.6304,9.9882],
    CGN:[50.8659,7.1427], NUE:[49.4987,11.0669], HAJ:[52.4611,9.6850],
    LEJ:[51.4239,12.2161], BRE:[53.0475,8.7868],
    // ── Netherlands & Belgium ──
    AMS:[52.3086,4.7639], EIN:[51.4501,5.3745], RTM:[51.9569,4.4372],
    BRU:[50.9010,4.4844], CRL:[50.4592,4.4527], LGG:[50.6374,5.4432],
    // ── Switzerland & Austria ──
    ZRH:[47.4647,8.5492], GVA:[46.2381,6.1089], BSL:[47.5896,7.5300],
    VIE:[48.1103,16.5697], SZG:[47.7933,13.0043], INN:[47.2602,11.3440],
    GRZ:[46.9911,15.4396], LNZ:[48.2332,14.1875],
    // ── Spain & Portugal ──
    MAD:[40.4936,-3.5668], BCN:[41.2974,2.0833], VLC:[39.4893,-0.4816],
    AGP:[36.6749,-4.4991], PMI:[39.5517,2.7388], SVQ:[37.4180,-5.8931],
    BIO:[43.3011,-2.9106], LPA:[27.9319,-15.3866], TFS:[28.0445,-16.5725],
    ACE:[28.9455,-13.6052], FUE:[28.4527,-13.8638],
    LIS:[38.7742,-9.1342], OPO:[41.2481,-8.6814], FAO:[37.0144,-7.9659],
    PDL:[37.7412,-25.6979],
    // ── Italy ──
    FCO:[41.8003,12.2389], MXP:[45.6301,8.7231], LIN:[45.4456,9.2763],
    VCE:[45.5053,12.3519], NAP:[40.8860,14.2908], BGY:[45.6739,9.7042],
    BLQ:[44.5354,11.2887], PSA:[43.6839,10.3927], PMO:[38.1759,13.0910],
    CTA:[37.4668,15.0664],
    // ── Scandinavia ──
    CPH:[55.6180,12.6508], ARN:[59.6519,17.9186], OSL:[60.1939,11.1004],
    TRD:[63.4578,10.9239], BGO:[60.2934,5.2181], HEL:[60.3172,24.9633],
    TMP:[61.4141,23.6044], OUL:[64.9301,25.3545], KEF:[63.9850,-22.6056],
    RVK:[64.8384,11.1461],
    // ── Eastern Europe ──
    PRG:[50.1008,14.2600], BRQ:[49.1513,16.6944], WAW:[52.1657,20.9671],
    KRK:[50.0777,19.7848], WRO:[51.1027,16.8858], GDN:[54.3776,18.4662],
    KTW:[50.4743,19.0800], POZ:[52.4210,16.8263], RZE:[50.1100,22.0190],
    BUD:[47.4369,19.2556], DEB:[47.4886,21.6153], MSQ:[53.8825,28.0307],
    KBP:[50.3451,30.8944], LWO:[49.8125,23.9561], ODS:[46.4268,30.6765],
    DNK:[48.3572,35.1006], HRK:[49.9248,36.2900], IEV:[50.4013,30.4491],
    SVO:[55.9736,37.4125], DME:[55.4088,37.9063], VKO:[55.5915,37.2615],
    LED:[59.8003,30.2625], OVB:[54.9663,82.6507], SVX:[56.7431,60.8028],
    KZN:[55.6063,49.2787], AER:[43.4499,39.9566], UFA:[54.5575,55.8744],
    ROV:[47.2582,39.8181], KJA:[56.1727,92.4933],
    OTP:[44.5722,26.1020], SOF:[42.6952,23.4063], TGD:[42.3597,19.2519],
    BEG:[44.8184,20.3091], ZAG:[45.7429,16.0688], LJU:[46.2237,14.4576],
    SKP:[41.9614,21.6214], TIA:[41.4147,19.7206], RIX:[56.9236,23.9711],
    TLL:[59.4133,24.8328], VNO:[54.6341,25.2858],
    // ── Turkey ──
    IST:[41.2608,28.7418], SAW:[40.8986,29.3092], AYT:[36.8987,30.7997],
    ESB:[40.1281,32.9951], ADB:[38.2924,27.1570], GZT:[36.9473,37.4787],
    TZX:[40.9950,39.7897], DLM:[36.7113,28.7925], BJV:[37.2505,27.6640],
    // ── Middle East ──
    DXB:[25.2528,55.3644], AUH:[24.4330,54.6511], SHJ:[25.3286,55.5172],
    RKT:[25.6108,55.9388], DOH:[25.2609,51.6138], BAH:[26.2708,50.6336],
    KWI:[29.2267,47.9689], MCT:[23.5933,58.2844], SLL:[17.0387,54.0913],
    AMM:[31.7226,35.9932], AQJ:[29.6116,35.0181], BEY:[33.8209,35.4884],
    TLV:[32.0114,34.8867], SDV:[32.1142,34.7822],
    CAI:[30.1219,31.4056], HRG:[27.1783,33.7994], SSH:[27.9773,34.3950],
    LXR:[25.6710,32.7066], ASW:[23.9644,32.8200],
    RUH:[24.9576,46.6988], JED:[21.6796,39.1565], MED:[24.5534,39.7051],
    DMM:[26.4712,49.7979], AHB:[18.2404,42.6566], GIZ:[16.9011,42.5858],
    TUU:[28.3654,36.6189], ELQ:[26.3028,43.7744],
    BGW:[33.2626,44.2346], BSR:[30.5491,47.6621], NJF:[31.9900,44.4042],
    KHI:[24.9065,67.1608], LHE:[31.5216,74.4036], ISB:[33.6167,73.0997],
    PEW:[33.9939,71.5146], MUX:[30.2032,71.4192], SKT:[32.5356,74.3636],
    THR:[35.6892,51.3133], IKA:[35.4161,51.1522], SYZ:[29.5392,52.5898],
    TBZ:[38.1339,46.2350], MHD:[36.2352,59.6400], KER:[30.2744,56.9578],
    IFN:[32.7508,51.8613], AWZ:[31.3374,48.7620],
    // ── Africa ──
    JNB:[-26.1392,28.2460], CPT:[-33.9648,18.6017], DUR:[-29.6144,31.1197],
    PLZ:[-33.9849,25.6173], ELS:[-32.9606,27.8259], GRJ:[-34.0056,22.3789],
    BFN:[-29.0927,26.3024], MQP:[-24.3683,31.0988],
    NBO:[1.3192,36.9275], MBA:[-4.0348,39.5942], JRO:[-3.4295,37.0695],
    DAR:[-6.8781,39.2026], ZNZ:[-6.2220,39.2249], ADD:[8.9779,38.7993],
    DJI:[11.5472,43.1594], MGQ:[2.0144,45.3047], BJM:[-3.3242,29.3185],
    KGL:[-1.9683,30.1395], ACC:[5.6052,-0.1668], ABJ:[5.2613,-3.9262],
    LOS:[6.5774,3.3212], ABV:[9.0068,7.2632], KAN:[12.0476,8.5246],
    LFW:[6.1657,1.2545], OUA:[12.3532,-1.5124], BKO:[12.5335,-7.9499],
    DKR:[14.7397,-17.4902], CKY:[9.5769,-13.6120], FNA:[8.6164,-13.1955],
    ROB:[6.2338,-10.3623], MLW:[6.2890,-10.7587], NIM:[13.4815,2.1836],
    NDJ:[12.1337,15.0340], LBV:[0.4586,9.4123], DLA:[4.0061,9.7195],
    YAO:[3.8360,11.5234], CMN:[33.3675,-7.5900], RAK:[31.6069,-8.0363],
    AGA:[30.3250,-9.4131], FEZ:[33.9273,-4.9778], TNG:[35.7268,-5.9169],
    TUN:[36.8510,10.2272], SFA:[34.7179,10.6910], MIR:[35.7581,10.7547],
    ALG:[36.6910,3.2154], ORN:[35.6239,-0.6212], CZL:[36.2760,6.6204],
    TIP:[32.6635,13.1590], BEN:[32.0967,20.2695], LMQ:[26.6120,14.4722],
    TNR:[-18.7969,47.4788], MJN:[-15.6672,46.3512], RUN:[-20.8871,55.5103],
    MRU:[-20.4302,57.6836], SEZ:[-4.6743,55.5218], HAH:[-11.5337,43.2719],
    // ── Japan ──
    NRT:[35.7720,140.3929], HND:[35.5494,139.7798], KIX:[34.4272,135.2440],
    NGO:[34.8583,136.8050], CTS:[42.7752,141.6920], FUK:[33.5857,130.4511],
    OKA:[26.1958,127.6467], SDJ:[38.1397,140.9172], ITM:[34.7854,135.4380],
    HIJ:[34.4361,132.9194], KMJ:[32.8373,130.8554], KOJ:[31.8034,130.7190],
    OIT:[33.4794,131.7370], TAK:[34.2147,134.0158], KCZ:[33.5461,133.6693],
    UKB:[34.6328,135.2239], MYJ:[33.8274,132.6993], GAJ:[38.4122,140.3710],
    AOJ:[40.7347,140.6907], HNA:[39.4286,141.1353],
    // ── Korea ──
    ICN:[37.4602,126.4407], GMP:[37.5583,126.7906], PUS:[35.1795,128.9381],
    CJU:[33.5113,126.4930], TAE:[35.8941,128.6589], RSU:[34.8403,127.6167],
    MWX:[34.9913,126.3828], KUV:[35.9024,126.6158], WJU:[37.4382,127.9596],
    YNY:[38.0583,128.6694], CJJ:[36.7166,127.4991],
    // ── China ──
    PEK:[40.0799,116.6031], PKX:[39.5090,116.4100], PVG:[31.1443,121.8083],
    SHA:[31.1979,121.3364], CAN:[23.3925,113.2988], SZX:[22.6393,113.8107],
    CTU:[30.5785,103.9472], KMG:[24.9922,102.7442], WUH:[30.7838,114.2081],
    XMN:[24.5440,118.1277], CSX:[28.1892,113.2196], HGH:[30.2295,120.4346],
    NKG:[31.7420,118.8620], TNA:[36.8572,117.2160], TAO:[36.2661,120.3745],
    DLC:[38.9657,121.5386], SHE:[41.6398,123.4834], HRB:[45.6234,126.2500],
    CGQ:[43.9962,125.6850], HAK:[19.9349,110.4590], SYX:[18.3079,109.4122],
    LHW:[36.5203,103.6217], URC:[43.9071,87.4742], XIY:[34.4471,108.7516],
    KWE:[26.5385,106.8013], NNG:[22.6083,108.1722], FOC:[25.9352,119.6630],
    HFE:[31.7800,117.2981], TYN:[37.7469,112.6281], YNT:[37.4017,121.3725],
    HET:[40.8514,111.8240], INC:[38.4822,106.0092], XNN:[36.5275,102.0428],
    LXA:[29.2983,90.9119], KHN:[28.8650,115.9000],
    // ── Hong Kong & Macau & Taiwan ──
    HKG:[22.3080,113.9185], MFM:[22.1496,113.5920],
    TPE:[25.0777,121.2328], TSA:[25.0694,121.5522], KHH:[22.5771,120.3500],
    TXG:[24.1863,120.6554], TTT:[22.7549,121.1018], HUN:[24.0232,121.6169],
    RMQ:[24.2647,120.6204],
    // ── Mongolia ──
    ULN:[47.8431,106.7666],
    // ── Southeast Asia ──
    SIN:[1.3644,103.9915], KUL:[2.7456,101.7099], LGK:[6.3297,99.7278],
    PEN:[5.2977,100.2769], BKI:[5.9379,116.0501], KCH:[1.4847,110.3360],
    MYY:[4.3220,113.9870], AOR:[5.6768,100.3985], IPH:[4.5677,101.0920],
    JHB:[1.6413,103.6697],
    BKK:[13.6811,100.7472], DMK:[13.9126,100.6071], HKT:[8.1132,98.3169],
    CNX:[18.7677,98.9626], CEI:[19.9520,99.8829], UTP:[12.6800,101.0049],
    UBP:[15.2513,104.8700], KKC:[16.4666,102.7836], NST:[8.5392,99.9448],
    HDY:[6.9332,100.3930], USM:[9.5478,100.0629], KBV:[11.7746,99.9516],
    CGK:[-6.1275,106.6537], DPS:[-8.7482,115.1673], SUB:[-7.3798,112.7867],
    UPG:[-5.0616,119.5540], MDC:[1.5493,124.9260], KNO:[3.6425,98.8874],
    PDG:[-0.8787,100.3516], PLM:[-2.8983,104.6999], BPN:[1.2677,116.8942],
    PKU:[0.4608,101.4444], BTJ:[5.5223,95.4204], AMQ:[-3.7103,128.0883],
    LOP:[-8.7573,116.2766], SRG:[-6.9727,110.3754], JOG:[-7.7882,110.4317],
    SOQ:[-0.9261,131.1189],
    MNL:[14.5086,121.0194], CEB:[10.3075,123.9794], DVO:[7.1255,125.6458],
    ILO:[10.7131,122.5456], BCD:[10.6428,122.9296], KLO:[11.6790,122.3758],
    PPS:[9.7421,118.7591], TAG:[9.6641,124.0449], CYP:[11.0244,124.5456],
    ZAM:[6.9221,122.0598],
    SGN:[10.8188,106.6520], HAN:[21.2187,105.8047], DAD:[16.0439,108.1993],
    CXR:[12.2271,109.2192], HPH:[20.8198,106.7248], HUI:[16.4015,107.7027],
    VCA:[10.0851,105.7118], VII:[18.7378,105.6708], BMV:[12.6683,108.1200],
    UIH:[13.9550,109.0421],
    PNH:[11.5466,104.8440], REP:[13.4107,103.8130], VTE:[17.9883,102.5632],
    PAK:[16.2706,104.7822], RGN:[16.9073,96.1332], MDL:[21.7022,96.0330],
    HEH:[20.7474,96.7919], NYU:[21.1782,94.9299], BWN:[4.9442,114.9283],
    // ── South & Central Asia ──
    BOM:[19.0896,72.8656], DEL:[28.5562,77.1000], MAA:[12.9900,80.1693],
    BLR:[13.1986,77.7066], HYD:[17.2403,78.4294], CCU:[22.6547,88.4467],
    COK:[10.1520,76.4019], AMD:[23.0769,72.6347], PNQ:[18.5821,73.9197],
    GOI:[15.3808,73.8314], JAI:[26.8242,75.8122], LKO:[26.7606,80.8893],
    BBI:[20.2444,85.8178], TRV:[8.4782,76.9201], IXC:[30.6735,76.7885],
    ATQ:[31.7096,74.7974], VTZ:[17.7212,83.2245], NAG:[21.0922,79.0472],
    IXB:[26.6812,88.3286], GAU:[26.1061,91.5859], SXR:[33.9871,74.7742],
    JDH:[26.2512,73.0489], UDR:[24.6177,73.8961], VNS:[25.4524,82.8593],
    PAT:[25.5913,85.0880], BHO:[23.2875,77.3374], IDR:[22.7218,75.8012],
    IXZ:[11.6412,92.7296], IXJ:[32.6891,74.8375], IXA:[23.8870,91.2400],
    DIB:[27.4839,94.9128], TEZ:[26.7091,92.7847], IXS:[24.9129,92.9787],
    IXE:[12.9613,74.8900], CNN:[11.5178,77.0008],
    CMB:[7.1808,79.8841], HRI:[6.2850,80.9278], MLE:[4.1918,73.5290],
    KTM:[27.6966,85.3591], PKR:[28.2009,83.9825], DAC:[23.8433,90.3978],
    CGP:[22.2496,91.8133], ZYL:[24.5925,91.8677], CXB:[21.4522,92.0195],
    ISB:[33.6167,73.0997], KBL:[34.5659,69.2123], HEA:[34.2100,62.2281],
    MZR:[36.7069,67.2090], FAH:[32.3612,62.1829],
    // ── Australia ──
    SYD:[-33.9399,151.1753], MEL:[-37.6690,144.8410], BNE:[-27.3842,153.1175],
    PER:[-31.9403,115.9669], ADL:[-34.9450,138.5300], CBR:[-35.3069,149.1950],
    HBA:[-42.8361,147.5078], OOL:[-28.1644,153.5046], CNS:[-16.8858,145.7452],
    TSV:[-19.2525,146.7655], MKY:[-21.1717,149.1797], ROK:[-23.3819,150.4753],
    LST:[-41.5453,147.2142], NTL:[-32.7950,151.8347], MCY:[-26.6033,153.0913],
    ABX:[-36.0675,146.9577], MQL:[-34.2292,142.0853], DBO:[-32.2175,148.5747],
    // ── New Zealand ──
    AKL:[-37.0082,174.7850], CHC:[-43.4894,172.5322], WLG:[-41.3272,174.8050],
    ZQN:[-45.0211,168.7392], DUD:[-45.9281,170.1983], IVC:[-46.4124,168.3130],
    NPL:[-39.0086,174.1792], PMR:[-40.3206,175.6169], NSN:[-41.2983,173.2210],
    BHE:[-41.5183,173.8703], TRG:[-37.6719,176.1961], ROT:[-38.1092,176.3172],
    // ── Pacific Islands ──
    PPT:[-17.5534,-149.6065], FAA:[-17.5534,-149.6065], BOB:[-16.4445,-151.7512],
    MOZ:[-17.4903,-149.7613], RAR:[-21.2026,-159.8055], APW:[-13.8300,-172.0083],
    PPG:[-14.3310,-170.7105], NAN:[-17.7553,177.4425], SUV:[-18.0433,178.5590],
    TBU:[-21.2420,-175.1499], VLI:[-17.6993,168.3196], HIR:[-9.4280,160.0527],
    GEF:[-8.1281,157.0560], TRW:[1.3816,173.0176], CXI:[1.9862,-157.3500],
    ROR:[7.3673,134.5443], POM:[-9.4438,147.2200], LAE:[-6.5693,146.7260],
    RAB:[-4.3401,152.3800], HGU:[-5.8268,144.2960], GKA:[-6.0815,145.3919],
    DAU:[-6.5693,146.7260], WWK:[-3.5838,143.6691],
  };

// Great-circle distance in miles
function getDistanceMiles(orig, dest) {
  const c1 = AIRPORT_COORDS[orig];
  const c2 = AIRPORT_COORDS[dest];
  if (!c1 || !c2) return null;
  const R    = 3958.8; // Earth radius in miles
  const dLat = (c2[0] - c1[0]) * Math.PI / 180;
  const dLon = (c2[1] - c1[1]) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(c1[0]*Math.PI/180) * Math.cos(c2[0]*Math.PI/180) *
               Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ─── Airline code → name lookup ───────────────────────────────────────────────
const CARRIER_MAP = Object.fromEntries(CARRIERS.map(c => [c.code, c.name]));
const SORTED_CARRIERS = [...CARRIERS].sort((a, b) => a.name.localeCompare(b.name));

function getAirlineFromFlight(flightNum) {
  if (!flightNum || flightNum.length < 2) return null;
  // Try 2-letter code first
  const code2 = flightNum.slice(0, 2).toUpperCase();
  if (CARRIER_MAP[code2]) return { code: code2, name: CARRIER_MAP[code2] };
  // Try 1-letter code
  const code1 = flightNum.slice(0, 1).toUpperCase();
  if (CARRIER_MAP[code1]) return { code: code1, name: CARRIER_MAP[code1] };
  return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTCOMES = [
  { id:"boarded",  label:"Boarded",        color:"text-green-400", bg:"bg-green-400/10 border-green-400/20" },
  { id:"denied",   label:"Denied",         color:"text-red-400",   bg:"bg-red-400/10   border-red-400/20"   },
  { id:"standby",  label:"Made Standby",   color:"text-sky-400",   bg:"bg-sky-400/10   border-sky-400/20"   },
  { id:"upgrade",  label:"Upgraded",       color:"text-amber-400", bg:"bg-amber-400/10 border-amber-400/20" },
  { id:"missed",   label:"Missed/No-show", color:"text-white/40",  bg:"bg-white/5      border-white/10"     },
];

const CABINS = ["Economy","Premium Economy","Business","First"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1.5">
      {children}
    </label>
  );
}

function AirportInput({ id, placeholder, onChange }) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e) {
    const q = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    setQuery(q);
    if (q.length === 3) { onChange(q); setOpen(false); }
    else {
      onChange("");
      if (q.length >= 2) { setFiltered(ALL_AIRPORTS.filter(ap => ap.startsWith(q)).slice(0, 8)); setOpen(true); }
      else setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input id={id} value={query} onChange={handleChange} placeholder={placeholder}
        autoComplete="off" spellCheck={false}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          {filtered.map(ap => (
            <li key={ap} onMouseDown={() => { setQuery(ap); onChange(ap); setOpen(false); }}
              className="px-4 py-2.5 text-sm font-mono text-white hover:bg-sky-500/20 cursor-pointer transition-colors">{ap}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimpleSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={clsx("w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all",
          open ? "border-sky-500/50" : "", value ? "text-white" : "text-white/25")}>
        <span className="truncate">{value || placeholder}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-y-auto max-h-48">
          {options.map(o => (
            <li key={o} onMouseDown={() => { onChange(o); setOpen(false); }}
              className={clsx("px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between",
                o === value ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5")}>
              {o}{o === value && <span className="text-sky-400 text-xs">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Searchable airline dropdown
function AirlineSelect({ value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = SORTED_CARRIERS.find(c => c.name === value);
  const filtered = search.trim() === ""
    ? SORTED_CARRIERS
    : SORTED_CARRIERS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={clsx("w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-all",
          open ? "border-sky-500/50" : "", value ? "text-white" : "text-white/25")}>
        <span className="truncate">{value || "Select airline…"}</span>
        <span className={clsx("text-white/40 text-xs shrink-0 transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Type airline or code…"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-sky-500 focus:outline-none" />
          </div>
          <ul className="overflow-y-auto max-h-44">
            {filtered.length === 0
              ? <li className="px-4 py-3 text-sm text-white/30 text-center">No airlines found</li>
              : filtered.map(c => (
                <li key={c.code} onMouseDown={() => { onChange(c.name); setOpen(false); setSearch(""); }}
                  className={clsx("px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between gap-2",
                    c.name === value ? "bg-sky-500/20 text-sky-300" : "text-white hover:bg-white/5")}>
                  <span className="truncate">
                    <span className="font-mono font-semibold text-xs mr-2 text-white/40">{c.code}</span>
                    {c.name}
                  </span>
                  {c.name === value && <span className="text-sky-400 text-xs shrink-0">✓</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }) {
  const outcome = OUTCOMES.find(o => o.id === entry.outcome) ?? OUTCOMES[0];
  const miles   = getDistanceMiles(entry.origin, entry.destination);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <span className="text-sm font-bold text-white font-mono">{entry.flight_number}</span>
          {entry.airline && <span className="text-xs text-white/40 ml-2">{entry.airline}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${outcome.bg} ${outcome.color}`}>
            {outcome.label}
          </div>
          <button onClick={() => onDelete(entry.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center">
            <div className="font-display text-2xl font-black text-white">{entry.origin}</div>
            <div className="text-xs text-white/40">{entry.date}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            {miles && <div className="text-xs text-white/30">{miles.toLocaleString()} mi</div>}
            <div className="flex items-center gap-2 w-full">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-white/20 text-xs">—</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            {entry.cabin && <div className="text-xs text-white/30">{entry.cabin}</div>}
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-black text-white">{entry.destination}</div>
            {entry.seat && <div className="text-xs text-white/40">Seat {entry.seat}</div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {entry.load_pct != null && (
            <span className="text-xs text-white/30">Load <span className={clsx("font-mono font-semibold",
              entry.load_pct >= 90 ? "text-red-400" : entry.load_pct >= 70 ? "text-amber-400" : "text-green-400")}>
              {entry.load_pct}%
            </span></span>
          )}
          {entry.notes && <span className="text-xs text-white/30 italic">{entry.notes}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── New Entry Form ───────────────────────────────────────────────────────────
function NewEntryForm({ onSubmit, onClose }) {
  const [flight,  setFlight]  = useState("");
  const [airline, setAirline] = useState("");
  const [origin,  setOrigin]  = useState("");
  const [dest,    setDest]    = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().split("T")[0]);
  const [cabin,   setCabin]   = useState("");
  const [outcome, setOutcome] = useState("");
  const [seat,    setSeat]    = useState("");
  const [load,    setLoad]    = useState("");
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);

  // Auto-fill airline from flight number
  function handleFlightChange(e) {
    const val = e.target.value.toUpperCase();
    setFlight(val);
    const detected = getAirlineFromFlight(val);
    if (detected && !airline) setAirline(detected.name);
  }

  const canSubmit = flight && origin.length === 3 && dest.length === 3 && date && outcome && !saving;

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit({
        flightNumber: flight,
        airline,
        origin:       origin.toUpperCase(),
        destination:  dest.toUpperCase(),
        date, cabin, outcome, seat,
        loadPct: load ? Number(load) : null,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0e1a] overflow-hidden"
        style={{ animation:"fadeUp 0.2s ease both" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-lg font-black text-white">Log a Trip</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Outcome */}
          <div>
            <Label>Outcome</Label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.id} onClick={() => setOutcome(o.id)}
                  className={clsx("rounded-lg px-3 py-2 text-sm font-semibold border text-left transition-all",
                    outcome === o.id ? `${o.bg} ${o.color}` : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8")}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flight number — auto-fills airline */}
          <div>
            <Label htmlFor="p-flight">Flight Number</Label>
            <input id="p-flight" value={flight} onChange={handleFlightChange}
              placeholder="KE082"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            {flight.length >= 2 && getAirlineFromFlight(flight) && (
              <p className="text-xs text-sky-400 mt-1">
                Detected: {getAirlineFromFlight(flight)?.name}
              </p>
            )}
          </div>

          {/* Airline dropdown */}
          <div>
            <Label>Airline</Label>
            <AirlineSelect value={airline} onChange={setAirline} />
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>From</Label><AirportInput placeholder="JFK" onChange={setOrigin} /></div>
            <div><Label>To</Label><AirportInput placeholder="ICN" onChange={setDest} /></div>
          </div>

          {/* Show distance preview */}
          {origin.length === 3 && dest.length === 3 && (() => {
            const mi = getDistanceMiles(origin, dest);
            return mi ? (
              <p className="text-xs text-white/30 -mt-2">
                Distance: <span className="text-white/50 font-mono">{mi.toLocaleString()} mi</span>
              </p>
            ) : null;
          })()}

          {/* Date + Cabin */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-date">Date</Label>
              <input id="p-date" type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
            <div><Label>Cabin</Label><SimpleSelect options={CABINS} value={cabin} onChange={setCabin} placeholder="Select…" /></div>
          </div>

          {/* Seat + Load */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-seat">Seat (optional)</Label>
              <input id="p-seat" value={seat} onChange={e => setSeat(e.target.value)} placeholder="14A"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
            <div>
              <Label htmlFor="p-load">Load % (optional)</Label>
              <input id="p-load" type="number" min="0" max="100" value={load} onChange={e => setLoad(e.target.value)} placeholder="85"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="p-notes">Notes (optional)</Label>
            <textarea id="p-notes" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Crew was great, got upgraded at gate…" rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-bold border border-white/10 text-white/40 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={clsx("flex-1 rounded-xl py-3 font-display font-black text-sm uppercase tracking-widest transition-all",
              canSubmit ? "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]" : "bg-white/5 text-white/25 cursor-not-allowed")}>
            {saving ? "Saving…" : "Log Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PassbookPage() {
  const [entries,       setEntries]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [yearFilter,    setYearFilter]    = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const rows = await getPassLog();
      setEntries(rows);
    } catch (err) {
      console.error("Failed to load pass log:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(entry) {
    const saved = await createPassEntry(entry);
    setEntries(prev => [saved, ...prev]);
    setShowForm(false);
  }

  async function handleDelete(id) {
    await deletePassEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const stats = useMemo(() => {
    const boarded = entries.filter(e => e.outcome === "boarded" || e.outcome === "upgrade").length;
    const total   = entries.filter(e => e.outcome !== "missed").length;
    const rate    = total > 0 ? Math.round((boarded / total) * 100) : 0;
    const miles   = entries
      .filter(e => e.outcome === "boarded" || e.outcome === "upgrade")
      .reduce((sum, e) => sum + (getDistanceMiles(e.origin, e.destination) ?? 0), 0);
    return { boarded, total, rate, miles };
  }, [entries]);

  const years = useMemo(() => {
    return [...new Set(entries.map(e => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const yearOk    = yearFilter    === "all" || e.date?.startsWith(yearFilter);
      const outcomeOk = outcomeFilter === "all" || e.outcome === outcomeFilter;
      return yearOk && outcomeOk;
    });
  }, [entries, yearFilter, outcomeFilter]);

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(1rem); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight leading-none">
              Pass<br /><span className="text-sky-400">Logbook</span>
            </h1>
            <p className="mt-3 text-sm text-white/40 max-w-sm">Every non-rev trip — boarded, denied, upgraded.</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="mt-1 rounded-xl px-4 py-2.5 bg-sky-500 text-white text-sm font-display font-black uppercase tracking-widest hover:bg-sky-400 transition-colors shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            + Log Trip
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label:"Trips",        value: stats.total,  color:"text-white"       },
            { label:"Boarded",      value: stats.boarded, color:"text-green-400"  },
            { label:"Success Rate", value: stats.total > 0 ? `${stats.rate}%` : "—",
              color: stats.rate >= 70 ? "text-green-400" : stats.rate >= 40 ? "text-amber-400" : "text-red-400" },
            { label:"Miles Flown",  value: stats.miles >= 1000 ? `${(stats.miles/1000).toFixed(1)}k` : stats.miles || "—", color:"text-sky-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
              <div className={`font-display text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="flex gap-1">
            {["all", ...years].map(y => (
              <button key={y} onClick={() => setYearFilter(y)}
                className={clsx("rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                  yearFilter === y ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/8")}>
                {y === "all" ? "All Years" : y}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {[{ id:"all", label:"All" }, ...OUTCOMES].map(o => (
              <button key={o.id} onClick={() => setOutcomeFilter(o.id)}
                className={clsx("rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                  outcomeFilter === o.id ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/8")}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="text-white/40 text-sm">No trips logged yet.</div>
            <div className="text-white/25 text-xs mt-1">Hit "+ Log Trip" to add your first entry.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {showForm && <NewEntryForm onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
    </div>
  );
}
