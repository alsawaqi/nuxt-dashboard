<template>
    <aside class="sidebar">
        <button type="button" class="sidebar-close-btn">
            <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
        </button>
        <div>
            <NuxtLink to="/dashboard" class="sidebar-logo">
                <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="light-logo">
                <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="dark-logo">
                <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="logo-icon">
            </NuxtLink>
        </div>
        <div class="sidebar-menu-area">
            <ul class="sidebar-menu" id="sidebar-menu">
                <li>
                    <NuxtLink to="/dashboard">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="menu-icon"></iconify-icon>
                        <span>Dashboard</span>
                    </NuxtLink>
                   
                </li>
                <li class="sidebar-menu-group-title">Application</li>
                <li>
                    <NuxtLink to="/dashboard/devices">
                        <iconify-icon icon="mdi:devices" class="menu-icon"></iconify-icon>
                        <span>Devices</span>
                    </NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/dashboard/status">
                       <iconify-icon icon="mdi:checkbox-marked-circle-outline" class="menu-icon"></iconify-icon>
                        <span>Status</span>
                    </NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/dashboard/locations">
                       <iconify-icon icon="material-symbols:map-outline" class="menu-icon"></iconify-icon>
                        <span>Locations</span>
                    </NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/dashboard/charity">
                      <iconify-icon icon="mdi:hand-heart-outline" class="menu-icon"></iconify-icon>
                        <span>Charity</span>
                    </NuxtLink>
                </li>
               
           
 

      

            
           
        
          
            
          

           
                      
              
            </ul>
        </div>
    </aside>
</template>