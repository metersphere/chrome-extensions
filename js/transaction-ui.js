let background = chrome.extension.getBackgroundPage();
let transactions = background.transactions;
let tabKeyPressed = false;

$(document).ready(function () {
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
            transactions.setHttpTransactionName(key, transactionName);
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
            let httpTransaction = transactions.addHttpTransaction(transactionName);
            let httpLength = transactions.httpTransactions.length;
            transactionHeader(httpLength);

            const stepsCount = httpLength + 1;
            nameInput.attr('placeholder', `${stepsCount} 测试用例 / 标签`);

            listUl.append(liType(httpTransaction));

            addBtn.addClass('disabled').attr('disabled', 'disabled');
            nameInput.attr('disabled', 'disabled');
            chrome.runtime.sendMessage({command: 'update_transactions'});
        }
    }

    function toggleAddTransaction() {
        let disable = transactions.getLastHttpTransactionCounter() === 0;
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
        listUl.html('');
        let localHttpTransactions = transactions.httpTransactions;
        localHttpTransactions.forEach(function (transaction) {
            listUl.append(liType(transaction));
        });

        if (localHttpTransactions.length > 0) {
            transactionHeader(localHttpTransactions.length);
            $('#transaction-list').scrollTop(listUl[0].scrollHeight);
        }

        toggleAddTransaction();
    }

    chrome.runtime.onMessage.addListener(function (request) {
        switch (request.command) {
            case "notice_transactions":
                if (request.observable.recording === 'stopped') {
                    addBtn.attr('disabled', 'disabled').addClass('disabled');
                    nameInput.attr('disabled', 'disabled');
                }
                break;
            case "update_transactions":
                let newCounter = transactions.getLastHttpTransactionCounter();
                toggleAddTransaction();
                $('#transactions li:last-child .http-transaction-counter').html(newCounter);
                break;
        }
    });

    addMacClass();

    renderTransactions(transactions.httpTransactions);
});

