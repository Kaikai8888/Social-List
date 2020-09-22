const BASIC_PATH = 'https://lighthouse-user-api.herokuapp.com/api/v1/'
const INDEX_PATH = BASIC_PATH + 'users/'
const USERS_PER_PAGE = 18

//以兩個物件分別存取 all user 及 favorite tab的資料及結點 (可分別傳入函式，減少對函式的修改)
const allUsers = {
  data: [],
  filterResults: [],
  filterConditions: [],
  curPage: 1,
  dataPanel: document.querySelector('#all-user-data-panel'),
  searchBar: document.querySelector('#all-user-search-bar'),
  paginator: document.querySelector('#all-user-paginator'),
  filterProperty: document.querySelector('#all-user-filter-property'),
  filterConditionsNode: document.querySelector('#all-user-filter-conditions'),
  filterForm: document.querySelector('#all-user-filter-form')
}
const friends = {
  data: [],
  filterResults: [],
  filterConditions: [],
  curPage: 1,
  dataPanel: document.querySelector('#friends-data-panel'),
  searchBar: document.querySelector('#friends-search-bar'),
  paginator: document.querySelector('#friends-paginator'),
  filterProperty: document.querySelector('#friends-filter-property'),
  filterConditionsNode: document.querySelector('#friends-filter-conditions'),
  filterForm: document.querySelector('#friends-filter-form')
}

const userModalAddFriendBtn = document.querySelector('#user-modal-add-friend-btn')
const navbarTab = document.querySelector('#navbarTab')



//Initial rendering and event setting
axios.get(INDEX_PATH)
  .then(response => {
    allUsers.data = response.data.results
    renderPage(allUsers)
    renderPage(friends)
  })
  .catch(err => console.log(err))

userModalAddFriendBtn.addEventListener('click', e => {
  onAddFriendBtnClick(e)
  switchUserModalAddFriendBtn(Number(e.target.dataset.id))
})


//Functions
//Initial rendering and Event setting
function renderPage(tabData) {
  renderDataPanel(getUsersByPage(tabData.data, 1), tabData.dataPanel)
  renderPaginator(tabData.data.length, tabData.paginator)
  tabData.dataPanel.addEventListener('click', onPanelClick)
  tabData.paginator.addEventListener('click', onPaginatorClick)
  tabData.searchBar.addEventListener('keyup', onSearchBarEnter)
  tabData.filterProperty.addEventListener('click', clearSearchBar)
  tabData.filterForm.addEventListener('submit', e => {
    e.preventDefault()
  })
  tabData.filterConditionsNode.addEventListener('click', onFilterConditionsAreaClick)
}

function onPanelClick(e) {
  if (e.target.matches('.avatar')) {
    //Render User Modal 
    renderModal(Number(e.target.dataset.id))
  } else if (e.target.matches('.add-friend-btn')) {
    onAddFriendBtnClick(e)
  }
}


//pagination
function onPaginatorClick(e) {
  let page = e.target.dataset.page
  const tabData = (this.id === 'all-user-paginator') ? allUsers : friends
  const data = getDataByScenerio(tabData)
  const numbersOfPage = Math.ceil(Math.max(data.length, 1) / USERS_PER_PAGE)
  if (!page) return
  if (page === 'previous') {
    if (tabData.curPage === 1) return
    renderDataPanel(getUsersByPage(data, --tabData.curPage), tabData.dataPanel)
  } else if (page === 'next') {
    if (tabData.curPage === numbersOfPage) return
    renderDataPanel(getUsersByPage(data, ++tabData.curPage), tabData.dataPanel)
  } else {
    renderDataPanel(getUsersByPage(data, Number(page)), tabData.dataPanel)
    tabData.curPage = Number(page)
  }
}

function getUsersByPage(data, page) {
  const startIndex = (page - 1) * USERS_PER_PAGE
  return data.slice(startIndex, startIndex + USERS_PER_PAGE)
}

function renderPaginator(amount, paginator) {
  let numbersOfPage = Math.ceil(Math.max(amount, 1) / USERS_PER_PAGE)
  let html = ` <li class="page-item" data-page="previous">
      <a class="page-link" href="#" aria-label="Previous" data-page="previous">
        <span aria-hidden="true" data-page="previous">&laquo;</span>
      </a>
    </li>`
  for (let page = 1; page <= numbersOfPage; page++) {
    html += `<li class="page-item" data-page="${page}">
        <a class="page-link" href="#" data-page="${page}">${page}</a>
      </li>`
  }
  html += `<li class="page-item" data-page="next">
      <a class="page-link" href="#" aria-label="Next" data-page="next">
        <span aria-hidden="true" data-page="next">&raquo;</span>
      </a>
    </li>`
  paginator.innerHTML = html
}


//Search and refresh
//event handler
function onSearchBarEnter(e) {
  if (e.keyCode !== 13) return
  const tabData = e.target.id === 'all-user-search-bar' ? allUsers : friends
  const keyword = e.target.value.trim().toLowerCase()
  const property = tabData.filterProperty.value
  const data = getDataByScenerio(tabData)

  if (keyword === '') return
  tabData.filterResults = filterUsersByProperty(data, property, keyword)
  tabData.curPage = 1
  renderFilterResults(tabData)
  addFilterConditions(tabData, property, keyword)
  renderFilterConditions(tabData, property, keyword)

  //clear search bar
  tabData.searchBar.value = ''
}

function onFilterConditionsAreaClick(e) {
  if (!e.target.matches('.delete-btn')) return
  const tabData = this.id === 'all-user-filter-conditions' ? allUsers : friends
  let data = getDataByScenerio(tabData)

  if (e.target.matches('.filter-delete-btn') &&
    tabData.filterConditions.length > 1) {
    const property = e.target.dataset.filterProperty
    const keyword = e.target.dataset.filterKeyword

    //remove from filterConditions(data and DOM element)
    const index = tabData.filterConditions.findIndex(item => item.property === property && item.keyword === keyword)
    tabData.filterConditions.splice(index, 1)
    e.target.parentElement.remove()

    //filter users by remaining conditions and update filterResults 
    tabData.filterResults = filterUsersByMultipleConditions(tabData.data, tabData.filterConditions)
    data = tabData.filterResults
  } else if (e.target.matches('.filter-clear-all-btn') ||
    (e.target.matches('.filter-delete-btn') &&
      tabData.filterConditions.length === 1)) {
    const conditions = this.querySelectorAll('.filter-wrapper')
    conditions.forEach(node => node.remove())
    data = tabData.data
    tabData.filterResults = []
    tabData.filterConditions = []
    tabData.filterConditionsNode.parentElement.style = 'display:none'
  }

  renderDataPanel(getUsersByPage(data, 1), tabData.dataPanel)
  renderPaginator(data.length, tabData.paginator)
  tabData.curPage = 1
}

//functions
function filterUsersByProperty(data, property, keyword) {
  if (keyword === '') {
    return data
  } else {
    return data.filter(item => {
      switch (property) {
        case 'name':
          return (item.name + ' ' + item.surname).toLowerCase().includes(keyword)
        case 'gender':
          const regExp = new RegExp(`^${keyword}`)
          return regExp.test(item.gender)
        case 'age':
          if (!Number(keyword)) return
          return Number(keyword) === item.age
        case 'region':
          return item.region.toLowerCase().includes(keyword)
      }
    })
  }
}

function filterUsersByMultipleConditions(data, conditions) {
  return conditions.reduce((acc, condition) => {
    acc = filterUsersByProperty(acc, condition.property, condition.keyword)
    return acc
  }, data)
}

function addFilterConditions(tabData, property, keyword) {
  if (keyword.trim() === '') return
  tabData.filterConditions.push({ property, keyword })
}


function clearSearchBar(e) {
  const tabData = e.target.id.includes('all-user') ? allUsers : friends
  tabData.searchBar.value = ''
}

function renderFilterResults(tabData) {
  if (tabData.filterResults.length === 0) {
    tabData.dataPanel.innerHTML = '<div class="col warning">No result. Please check your input.</div>'
  } else {
    renderDataPanel(getUsersByPage(tabData.filterResults, 1), tabData.dataPanel)
  }
  renderPaginator(tabData.filterResults.length, tabData.paginator)
}

function renderFilterConditions(tabData, property, keyword) {
  const clearAllBtn = tabData.filterConditionsNode.querySelector('.filter-clear-all-btn')
  //show filter conditions area
  tabData.filterConditionsNode.parentElement.style = ''

  clearAllBtn.insertAdjacentHTML('beforebegin', `<div class="filter-wrapper" title="${property}: ${keyword}">
      <span class="filter-item">${property}: ${keyword}</span>
      <button class="filter-delete-btn delete-btn" data-filter-property="${property}" data-filter-keyword="${keyword}" title="delete">X</button>
    </div>`)
}


//Add friend refresh
function onAddFriendBtnClick(e) {
  const id = Number(e.target.dataset.id)
  if (!id) return

  addFriend(e, id)
  renderDataPanel(getUsersByPage(getDataByScenerio(allUsers), allUsers.curPage), allUsers.dataPanel)
  renderDataPanel(getUsersByPage(getDataByScenerio(friends), friends.curPage), friends.dataPanel)
  renderPaginator(getDataByScenerio(friends).length, friends.paginator)
}

function addFriend(e, id) {
  const user = allUsers.data.find(user => user.id === id)
  const friendIndex = friends.data.length ? friends.data.findIndex(f => f.id === id) : -1
  const icon = e.target.tagName === 'I' ? e.target : e.target.firstElementChild
  if (friendIndex > -1) {
    if (!confirm(`確定要將 ${user.name} ${user.surname}取消好友嗎?`)) return
    friends.data.splice(friendIndex, 1)

    //Remove from friends.filterResults if user is in filterResults
    const friendFilterResultsIndex = friends.filterResults.length ? friends.filterResults.findIndex(f => f.id === id) : -1
    if (friendFilterResultsIndex === -1) return
    friends.filterResults.splice(friendFilterResultsIndex, 1)

  } else {
    friends.data.push(user)

    //Add to friends.filterResults if user fit all filter conditions
    const checkedUser = filterUsersByMultipleConditions([user], friends.filterConditions)
    if (checkedUser.length === 0) return
    friends.filterResults.push(user)
  }
}

//General rendering function
function renderDataPanel(data, panel) {
  panel.innerHTML = data.map(item => {
    const isFriend = friends.data.find(f => f.id === item.id)
    const [btnStyle, icon] = isFriend ? ['friend-btn', 'fas fa-user-friends'] : ['plus-btn', 'fas fa-plus']
    return `<div class="col col-sm-4 col-md-3 col-lg-2 mb-3">        
        <div class="user p-2">
          <div class="avatar-wrapper d-flex justify-content-center">
            <a href="#" class="text-decoration-none text-dark avatar" data-toggle="modal" data-target="#user-modal" data-id="${item.id}">
              <img class="rounded-circle avatar" src="${item.avatar}" alt="User Avatar" data-id="${item.id}">
            </a> 
            <button class="add-friend-btn ${btnStyle}" data-id="${item.id}">
              <i class="${icon} icon add-friend-btn" data-id="${item.id}"></i>
            </button >
          </div >
          <div class="user-info">
            <div class="name text-center text-wrap">${item.name} ${item.surname}</div>
          </div>
        </div >  
    </div >`
  }).join('\n')

}

//rendering modal
function renderModal(id) {
  const avatar = document.querySelector('#user-modal-avatar img')
  const name = document.querySelector('#user-modal-name')
  const info = ['gender', 'age', 'region', 'email', 'birthday']

  changeModalDisplay('none')

  axios.get(INDEX_PATH + id)
    .then(response => {
      const data = response.data
      avatar.src = data.avatar
      name.innerText = `${data.name} ${data.surname}`
      info.forEach(item => {
        const selector = '#user-modal-' + item
        document.querySelector(selector).innerHTML = `<strong>${item[0].toUpperCase()}${item.slice(1)}:</strong> ${data[item]}`
      })
      userModalAddFriendBtn.dataset.id = data.id
      userModalAddFriendBtn.firstElementChild.dataset.id = data.id
      switchUserModalAddFriendBtn(data.id)
      changeModalDisplay('')
    })
    .catch(err => console.log(err))
}

function changeModalDisplay(mode) {
  document.querySelector('#user-modal .modal-content').style.display = mode
}

function switchUserModalAddFriendBtn(id) {
  const addFriendBtnIcon = userModalAddFriendBtn.querySelector('i')
  userModalAddFriendBtn.classList.remove('friend-btn', 'plus-btn')
  addFriendBtnIcon.classList.remove('fa-user-friends', 'fa-plus')

  if (friends.data.find(f => f.id === id)) {
    userModalAddFriendBtn.classList.add('friend-btn')
    addFriendBtnIcon.classList.add('fa-user-friends')
  } else {
    userModalAddFriendBtn.classList.add('plus-btn')
    addFriendBtnIcon.classList.add('fa-plus')
  }
}


//Get data by scenerio
function getDataByScenerio(tabData) {
  if (tabData.filterConditions.length !== 0) {
    return tabData.filterResults
  } else {
    return tabData.data
  }
}