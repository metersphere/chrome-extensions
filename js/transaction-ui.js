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

    // 不再硬编码placeholder，将由toggleAddTransaction动态设置

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

                    listUl.append(liType(response.transaction));

                    addBtn.addClass('disabled').attr('disabled', 'disabled');
                    nameInput.attr('disabled', 'disabled');
                    chrome.runtime.sendMessage({ action: 'update_transactions' });
                }
            });
        }
    }

    function toggleAddTransaction() {
        console.log('toggleAddTransaction called');
        // 首先检查录制状态
        chrome.runtime.sendMessage({ action: 'check_status' }, (response) => {
            console.log('Recording status response:', response);
            if (response && response.status) {
                let isRecording = response.status === 'recording';
                console.log('Is recording:', isRecording);

                if (!isRecording) {
                    // 如果没有在录制，禁用输入并提示用户
                    console.log('Not recording, disabling input');
                    nameInput.val('').attr('disabled', true);
                    nameInput.attr('placeholder', '请先开始录制...');
                    addBtn.addClass('disabled').attr('disabled', true);
                    return;
                }

                // 如果在录制状态，检查是否有transactions以及最后一个transaction是否有计数
                console.log('Transactions count:', transactions.httpTransactions.length);
                if (transactions.httpTransactions.length === 0) {
                    // 没有transactions，可以添加第一个
                    console.log('No transactions, enabling input for first transaction');
                    nameInput.removeAttr('disabled');
                    nameInput.attr('placeholder', '1 测试用例 / 标签');
                    if (!stringIsEmpty(nameInput.val())) {
                        addBtn.removeClass('disabled').removeAttr('disabled');
                    }
                } else {
                    // 有transactions，检查最后一个的计数
                    let lastTransaction = transactions.httpTransactions[transactions.httpTransactions.length - 1];
                    let disable = lastTransaction.counter === 0;
                    console.log('Last transaction counter:', lastTransaction.counter, 'Disable:', disable);

                    if (disable) {
                        nameInput.val('').attr('disabled', true);
                        nameInput.attr('placeholder', '请先完成当前测试用例的操作...');
                        addBtn.addClass('disabled').attr('disabled', true);
                    } else {
                        nameInput.removeAttr('disabled');
                        let nextNumber = transactions.httpTransactions.length + 1;
                        nameInput.attr('placeholder', `${nextNumber} 测试用例 / 标签`);
                        if (!stringIsEmpty(nameInput.val())) {
                            addBtn.removeClass('disabled').removeAttr('disabled');
                        }
                    }
                }
            } else {
                // 如果无法获取状态，默认禁用
                console.log('Cannot get recording status, disabling input');
                nameInput.val('').attr('disabled', true);
                nameInput.attr('placeholder', '无法连接到后台服务...');
                addBtn.addClass('disabled').attr('disabled', true);
            }
        });
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
            case "recording_status_changed":
                // 录制状态改变时，更新UI
                toggleAddTransaction();
                break;
        }
    });

    addMacClass();

    renderTransactions();
});

