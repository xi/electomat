<?php
if (!function_exists('http_negotiate_language')) {
    function http_negotiate_language($supported) {
        return $supported[0];
    }
}
?><!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <link rel="stylesheet" type="text/css" href="electomat.css"/>
    <style>
        body {
            margin: 0;
            height: 100vh;
        }
    </style>
</head>

<body>
    <div class="electomat" src="<?=$_GET['json'] ? $_GET['json'] : 'example.json'?>" lang="<?=http_negotiate_language(array('en', 'de'))?>"></div>
    <script type="module" src="electomat.js"></script>
</body>
</html>
