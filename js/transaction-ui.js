let transactions = null;
let tabKeyPressed = false;

// 从service worker获取transactions数据
async function getTransactionsFromBackground() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'get_transactions' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting transactions:', chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(response ? response.transactions : null);
            }
        });
    });
}

$(document).ready(async function () {
    // 初始化时获取transactions数据
    try {
        transactions = await getTransactionsFromBackground();
        if (!transactions) {
            // 如果获取失败，创建一个空的transactions对象
            transactions = {
                httpTransactions: [],
                addHttpTransaction: function (name) {
                    chrome.runtime.sendMessage({ action: 'add_transaction', name: name });
                },
                setHttpTransactionName: function (index, name) {
                    chrome.runtime.sendMessage({ action: 'set_transaction_name', index: index, name: name });
                },
                getLastHttpTransactionCounter: function () {
                    return this.httpTransactions.length > 0 ? this.httpTransactions[this.httpTransactions.length - 1].counter : 0;
                },
                getLastHttpTransaction: function () {
                    return this.httpTransactions.length > 0 ? this.httpTransactions[this.httpTransactions.length - 1] : { counter: 0 };
                }
            };
        }
    } catch (error) {
        console.error('Failed to get transactions from background:', error);
        transactions = {
            httpTransactions: [],
            addHttpTransaction: function (name) {
                chrome.runtime.sendMessage({ action: 'add_transaction', name: name });
            },
            setHttpTransactionName: function (index, name) {
                chrome.runtime.sendMessage({ action: 'set_transaction_name', index: index, name: name });
            },
            getLastHttpTransactionCounter: function () {
                return this.httpTransactions.length > 0 ? this.httpTransactions[this.httpTransactions.length - 1].counter : 0;
            },
            getLastHttpTransaction: function () {
                return this.httpTransactions.length > 0 ? this.httpTransactions[this.httpTransactions.length - 1] : { counter: 0 };
            }
        };
    }

    // 初始渲染
    renderTransactions();
    let nameInput = $('#transaction_name');
    let addBtn = $('#add-transaction');
    let listUl = $('#transactions');

    nameInput.keyup(function (event) {
        if (!$(this).val()) {
            addBtn.addClass('disabled').attr('disabled', true);
            return;
        } else {
            addBtn.removeClass('disabled').removeAttr('disabled');
        }
        if (event.keyCode === 13) {
            // 回车 添加
            addNewTransaction($(this).val());
            $(this).val('');
            addBtn.addClass('disabled');
            $('#transaction-list').scrollTop(listUl[0].scrollHeight);
        } else if (event.keyCode === 27) {
            //Esc 取消
            $(this).val('');
            addBtn.addClass('disabled');
        }
    });

    nameInput.attr('placeholder', '2 测试用例 / 标签');

    nameInput.keypress(function (event) {
        if (event.which === '13') {
            event.preventDefault();
        }
    });

    $(document).on('click', '.transaction-name', function () {
        $(this).hide();
        $(this).next().show();
        $(this).next().focus();
        $(this).next().val($(this).text());
    });

    $(document).on('keydown', '.transaction-input', function (event) {
        // 是否允许Tab键
        tabKeyPressed = event.keyCode === 9;
        if (tabKeyPressed) {
            event.preventDefault();
        }
    });

    $(document).on('focusout', '.transaction-input', function () {
        $(this).hide();
        $(this).prev().show();
        $(this).prev().focus();
        let key = $(this).data('key');
        let transactionName = $(this).val();
        if (!stringIsEmpty(transactionName)) {
            $(this).prev().text(transactionName);
            // 通过消息传递更新transaction名称
            chrome.runtime.sendMessage({
                action: 'set_transaction_name',
                index: key,
                name: transactionName
            }, () => {
                // 本地也更新
                if (transactions.httpTransactions[key]) {
                    transactions.httpTransactions[key].name = transactionName;
                }
                chrome.runtime.sendMessage({ action: 'update_transactions' });
            });
        }
        tabKeyPressed = false;
    });

    $('.transaction-input').focusout(function () {
        $(this).hide();
        $(this).prev().show();
        $(this).prev().focus();
    });

    addBtn.click(function () {
        let transactionName = nameInput.val();
        addNewTransaction(transactionName);
        nameInput.val('');
        addBtn.addClass('disabled');
    });

    function isMacOrIOS() {
        let platform = navigator.platform;
        let isMac = platform.indexOf('Mac') > -1;
        let iosPlatforms = ['iPhone', 'iPad', 'iPod'];
        let isIos = iosPlatforms.indexOf(platform) !== -1;
        return isMac || isIos;
    }

    function addMacClass() {
        if (isMacOrIOS()) {
            $('#transaction-content').addClass('mac');
        }
    }

    function liType(httpTransaction) {
        let key = httpTransaction.id;
        let name = httpTransaction.name;
        let httpTransactionCounter = httpTransaction.counter;
        return '<li><span class="transaction-name">' + name + '</span> <input class="transaction-input" data-key="' + key + '"><span class="transaction-counter-wrapper">(<span class="http-transaction-counter">' + httpTransactionCounter + '</span>)</span></li>';
    }

    function transactionHeader(numOfTransactions) {
        $('.transaction-title label').html(numOfTransactions + ' 测试用例 / 标签');
    }

    function addNewTransaction(transactionName) {
        if (!stringIsEmpty(transactionName)) {
            // 通过消息传递添加transaction
            chrome.runtime.sendMessage({
                action: 'add_transaction',
                name: transactionName
            }, (response) => {
                if (response && response.transaction) {
                    // 本地也添加到transactions数组中
                    transactions.httpTransactions.push(response.transaction);

                    let httpLength = transactions.httpTransactions.length;
                    transactionHeader(httpLength);

                    const stepsCount = httpLength + 1;
                    nameInput.attr('placeholder', `${stepsCount} 测试用例 / 标签`);

                    listUl.append(liType(response.transaction));

                    addBtn.addClass('disabled').attr('disabled', 'disabled');
                    nameInput.attr('disabled', 'disabled');
                    chrome.runtime.sendMessage({ action: 'update_transactions' });
                }
            });
        }
    }

    function toggleAddTransaction() {
        let lastTransaction = transactions.httpTransactions.length > 0 ?
            transactions.httpTransactions[transactions.httpTransactions.length - 1] :
            { counter: 0 };
        let disable = lastTransaction.counter === 0;
        if (disable) {
            nameInput.val('').attr('disabled', true);
            addBtn.addClass('disabled').attr('disabled', true);
        } else {
            nameInput.removeAttr('disabled');
            if (!stringIsEmpty(nameInput.val())) {
                addBtn.removeClass('disabled').removeAttr('disabled');
            }
        }
    }

    function stringIsEmpty(string) {
        return !/\S/.test(string);
    }

    function renderTransactions() {
        // 从后台获取最新的transactions数据
        chrome.runtime.sendMessage({ action: 'get_transactions' }, (response) => {
            if (response && response.transactions) {
                transactions = response.transactions;

                listUl.html('');
                let localHttpTransactions = transactions.httpTransactions;
                localHttpTransactions.forEach(function (transaction) {
                    listUl.append(liType(transaction));
                });

                if (localHttpTransactions.length > 0) {
                    transactionHeader(localHttpTransactions.length);
                    $('#transaction-list').scrollTop(listUl[0].scrollHeight);
                    let lastTransaction = localHttpTransactions[localHttpTransactions.length - 1];
                    $('#transactions li:last-child .http-transaction-counter').html(lastTransaction.counter);
                }
                toggleAddTransaction();
            }
        });
    }

    chrome.runtime.onMessage.addListener(function (request) {
        switch (request.action) {
            case "update_transactions":
                renderTransactions();
                break;
        }
    });

    addMacClass();

    renderTransactions();
});

